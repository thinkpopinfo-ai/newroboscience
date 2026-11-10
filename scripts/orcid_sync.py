#!/usr/bin/env python3
"""
Weekly ORCID sync for newroboscience (run by .github/workflows/orcid-sync.yml).

  1. Reads every public work on ORCID 0009-0003-5123-7729 (pub.orcid.org, no login).
  2. Adds abstract / venue from Crossref (Research Square, journals) or DataCite (Zenodo).
  3. Tags each paper with the space-sector audiences it is relevant to.
  4. Writes content/research.json -> src/build.js renders /research/ pages from it,
     with Google Scholar citation tags and schema.org data tied to the ORCID iD.
  5. Checks whether each DOI is indexed by OpenAlex, Semantic Scholar and NASA ADS
     (ADS only with the ADS_TOKEN secret) and writes reports/coverage_report.md and
     reports/social_posts.md (shown in the GitHub Actions run summary).

content/research.json contains no timestamps or citation counts, so it only changes
(and only gets committed) when a paper is added or edited on ORCID.

Standard library only.  python scripts/orcid_sync.py [--sample]
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORCID = os.environ.get("ORCID_ID", "0009-0003-5123-7729")
SITE = "https://newroboscience.netlify.app"
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "")
ADS_TOKEN = os.environ.get("ADS_TOKEN", "")
OUT_JSON = ROOT / "content" / "research.json"
REPORTS = ROOT / "reports"
UA = f"newroboscience-orcid-sync/1.0 (+{SITE}; mailto:{CONTACT_EMAIL or 'none'})"

# Keyword pattern -> space-sector audiences shown on each paper page.
AUDIENCE_RULES = [
    (r"raptor|starship|staged combustion|rocket engine|combustion|propuls|thrust|injector|retro.?propuls|booster",
     ["Launch-vehicle propulsion", "SpaceX", "Blue Origin", "Relativity Space", "NASA Marshall"]),
    (r"nozzle|cooling channel|regenerative|additive|additively|lpbf|fatigue|prognos|remaining useful life",
     ["Additive manufacturing for space", "Prognostics and health management", "NASA Glenn",
      "L3Harris Aerojet Rocketdyne", "Rocket Lab"]),
    (r"ablat|tps|thermal protection|heat shield|re-?entry|cryogen|subcooled",
     ["Thermal protection and cryogenics", "NASA Ames", "NASA Johnson"]),
    (r"quality intelligence|\baqi\b|inspection|defect|manufactur",
     ["Space hardware manufacturing quality", "NASA Safety and Mission Assurance", "Satellite manufacturers"]),
    (r"self-?healing|composite|polymer",
     ["Spacecraft materials", "NASA Langley"]),
    (r"robot|autonom|guidance|gnc",
     ["Space robotics and autonomy", "NASA JPL"]),
    (r"neuro|biofeedback|meditation|hematoma|shunt|hydroceph|biomedical",
     ["Human spaceflight health", "NASA Human Research Program"]),
]


def get_json(url, headers=None, retries=3):
    h = {"User-Agent": UA, "Accept": "application/json"}
    h.update(headers or {})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(4 * (attempt + 1)); continue
            print(f"  ! HTTP {e.code} for {url}", file=sys.stderr); return None
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < retries - 1:
                time.sleep(4 * (attempt + 1)); continue
            print(f"  ! network error for {url}: {e}", file=sys.stderr); return None


def val(d, *keys):
    for k in keys:
        d = (d or {}).get(k)
    return d


def fetch_orcid():
    data = get_json(f"https://pub.orcid.org/v3.0/{ORCID}/works")
    if not data:
        raise SystemExit("Could not read ORCID works (network, or works not set to 'Everyone').")
    works = []
    for g in data.get("group", []):
        s = (g.get("work-summary") or [None])[0]
        if not s:
            continue
        doi = url = None
        for e in val(s, "external-ids", "external-id") or []:
            if e.get("external-id-type") == "doi":
                doi = (e.get("external-id-value") or "").strip().lower()
                doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi)
            url = url or val(e, "external-id-url", "value")
        date = "-".join(x for x in (val(s, "publication-date", "year", "value"),
                                     val(s, "publication-date", "month", "value"),
                                     val(s, "publication-date", "day", "value")) if x)
        works.append({"title": (val(s, "title", "title", "value") or "").strip(), "doi": doi or "",
                      "date": date, "type": s.get("type") or "other",
                      "venue": val(s, "journal-title", "value") or "",
                      "url": (f"https://doi.org/{doi}" if doi else (url or val(s, "url", "value") or "")),
                      "abstract": "", "authors": []})
    return [w for w in works if w["title"]]


def clean(text):
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def enrich(w):
    if not w["doi"]:
        return
    q = urllib.parse.quote(w["doi"])
    if w["doi"].startswith("10.5281/"):  # Zenodo DOIs live in DataCite
        a = val(get_json(f"https://api.datacite.org/dois/{q}"), "data", "attributes") or {}
        desc = [d.get("description") for d in a.get("descriptions", []) if d.get("descriptionType") == "Abstract"]
        w["abstract"] = clean(desc[0]) if desc else w["abstract"]
        w["venue"] = w["venue"] or a.get("publisher") or "Zenodo"
        w["authors"] = [c.get("name", "") for c in a.get("creators", []) if c.get("name")]
    else:
        m = val(get_json(f"https://api.crossref.org/works/{q}"), "message") or {}
        w["abstract"] = clean(m.get("abstract")) or w["abstract"]
        w["venue"] = w["venue"] or (m.get("container-title") or [""])[0] or m.get("publisher") or ""
        w["authors"] = [" ".join(x for x in (a.get("given"), a.get("family")) if x)
                        for a in m.get("author", []) if a.get("family")]
    if w["doi"].startswith("10.21203/"):
        w["venue"] = "Research Square preprint"


def audiences(w):
    blob = f"{w['title']} {w['abstract']}".lower()
    tags = []
    for pat, aud in AUDIENCE_RULES:
        if re.search(pat, blob):
            tags += [a for a in aud if a not in tags]
    return tags


def coverage(w):
    out = {}
    if not w["doi"]:
        return {"openalex": None, "semantic_scholar": None, "nasa_ads": None}
    q = urllib.parse.quote(w["doi"])
    d = get_json(f"https://api.openalex.org/works/doi:{q}" + (f"?mailto={urllib.parse.quote(CONTACT_EMAIL)}" if CONTACT_EMAIL else ""))
    out["openalex"] = bool(d)
    out["openalex_orcid"] = bool(d) and any(val(a, "author", "orcid") and val(a, "author", "orcid").endswith(ORCID)
                                            for a in d.get("authorships", []))
    d = get_json(f"https://api.semanticscholar.org/graph/v1/paper/DOI:{q}?fields=citationCount")
    time.sleep(1.2)
    out["semantic_scholar"] = bool(d)
    out["citations"] = (d or {}).get("citationCount", 0) or 0
    if ADS_TOKEN:
        r = get_json("https://api.adsabs.harvard.edu/v1/search/query?q=" + urllib.parse.quote(f'doi:"{w["doi"]}"') + "&fl=bibcode",
                     headers={"Authorization": f"Bearer {ADS_TOKEN}"})
        out["nasa_ads"] = bool(val(r, "response", "docs"))
    else:
        out["nasa_ads"] = None
    return out


FIX = {
    "openalex": "usually appears 1-2 weeks after the DOI is registered; if longer, claim your OpenAlex profile",
    "semantic_scholar": "claim your author page on semanticscholar.org and use 'Add paper' with the DOI",
    "nasa_ads": "post it to arXiv (ADS ingests arXiv daily) or claim it at ui.adsabs.harvard.edu with ORCID mode on",
}


def report(works, cov):
    mk = {True: "yes", False: "**MISSING**", None: "not checked"}
    L = [f"# ORCID coverage report — {dt.date.today().isoformat()}", "",
         f"{len(works)} public works on ORCID {ORCID}. Site: {SITE}/research/", "",
         "| Paper | OpenAlex | Semantic Scholar | NASA ADS | Citations |", "| --- | --- | --- | --- | --- |"]
    todo = []
    for w, c in zip(works, cov):
        t = w["title"][:70] + ("…" if len(w["title"]) > 70 else "")
        L.append(f"| {t} | {mk[c.get('openalex')]} | {mk[c.get('semantic_scholar')]} | {mk[c.get('nasa_ads')]} | {c.get('citations', 0)} |")
        if not w["doi"]:
            todo.append(f"- **{t}**: no DOI on ORCID. Upload it to Zenodo to get one, then add it to ORCID.")
        for k in ("openalex", "semantic_scholar", "nasa_ads"):
            if c.get(k) is False:
                todo.append(f"- **{t}** missing on {k.replace('_', ' ')}: {FIX[k]}.")
        if c.get("openalex") and not c.get("openalex_orcid"):
            todo.append(f"- **{t}**: in OpenAlex but not linked to your ORCID yet.")
    if not ADS_TOKEN:
        todo.append("- NASA ADS not checked: add an ADS API token as the repo secret ADS_TOKEN "
                    "(ui.adsabs.harvard.edu → Account → Settings → API Token).")
    return "\n".join(L + ["", "## To do", ""] + (todo or ["- Nothing missing."])) + "\n"


def posts(works):
    out = ["# Post drafts (edit before posting)", ""]
    for w in works:
        link = w["url"] or SITE + "/research/"
        tags = " ".join("#" + re.sub(r"[^A-Za-z0-9]", "", a) for a in w["audiences"][:4])
        first = (w["abstract"].split(". ")[0] + ".") if w["abstract"] else "<one-line finding>"
        out += [f"## {w['title']}", "", "LinkedIn:", "", f"New research: {w['title']}", "", first, "",
                "What it means for the space industry: <one sentence>", "",
                f"Paper: {link}", f"All my research (ORCID): https://orcid.org/{ORCID}", "", tags, ""]
    return "\n".join(out)


SAMPLE = [
    {"title": "Physics-Informed Prognostics of Fatigue Failure in Additively Manufactured Rocket-Nozzle Cooling Channels",
     "doi": "10.21203/rs.3.rs-11269947/v1", "date": "2026-03", "type": "preprint", "venue": "", "authors": [],
     "url": "https://doi.org/10.21203/rs.3.rs-11269947/v1",
     "abstract": "Sample abstract on sparse-sensor observability and Bayesian calibration for nozzle cooling channels."},
    {"title": "A new ORCID-only test work on retro-propulsive landing", "doi": "10.9999/test.1", "date": "2026-11",
     "type": "journal-article", "venue": "Test Journal", "authors": [], "url": "https://doi.org/10.9999/test.1", "abstract": ""},
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", action="store_true")
    a = ap.parse_args()
    works = [dict(w) for w in SAMPLE] if a.sample else fetch_orcid()
    print(f"{len(works)} works on ORCID")
    for w in works:
        print(" -", w["title"][:80])
        if not a.sample:
            enrich(w)
        w["audiences"] = audiences(w)
        w["_cov"] = {"openalex": None, "semantic_scholar": None, "nasa_ads": None} if a.sample else coverage(w)
    works.sort(key=lambda w: (w["date"], w["title"]), reverse=True)
    keep = ("title", "doi", "date", "type", "venue", "authors", "url", "abstract", "audiences")
    OUT_JSON.write_text(json.dumps([{k: w[k] for k in keep} for w in works], indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "coverage_report.md").write_text(report(works, [w["_cov"] for w in works]), encoding="utf-8")
    (REPORTS / "social_posts.md").write_text(posts(works), encoding="utf-8")
    print(f"Wrote {OUT_JSON.relative_to(ROOT)} and {REPORTS.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
