"""
FAERS lookup proxy — wraps the OpenFDA Drug Event API.
No API key required. Free public endpoint.
Docs: https://open.fda.gov/apis/drug/event/
"""
import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/api/faers", tags=["faers"])

OPENFDA_BASE = "https://api.fda.gov/drug/event.json"


@router.get("/lookup")
async def faers_lookup(
    drug: str = Query(..., description="Drug name to look up in FAERS"),
    limit: int = Query(10, ge=1, le=100),
    serious: Optional[bool] = Query(None, description="Filter for serious events only"),
):
    """
    Proxy to OpenFDA FAERS API.
    Returns known adverse events for a drug from the FDA database.
    Used by the pipeline to cross-validate social media signals.
    """
    # Build search query — match on drug brand/generic name
    search = f'patient.drug.medicinalproduct:"{drug}"'
    if serious:
        search += " AND serious:1"

    params = {
        "search": search,
        "limit": limit,
        "count": "patient.reaction.reactionmeddrapt.exact",  # group by reaction type
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OPENFDA_BASE, params=params)

        if response.status_code == 404:
            # No results found — not an error
            return {"drug": drug, "total": 0, "reactions": [], "source": "FDA FAERS"}

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"OpenFDA returned {response.status_code}"
            )

        data = response.json()
        results = data.get("results", [])

        # Format into clean reaction list
        reactions = [
            {
                "reaction": r.get("term", ""),
                "count": r.get("count", 0),
            }
            for r in results
        ]

        return {
            "drug": drug,
            "total": data.get("meta", {}).get("results", {}).get("total", 0),
            "reactions": reactions[:limit],
            "source": "FDA FAERS",
        }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OpenFDA API timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"OpenFDA unreachable: {str(e)}")


@router.get("/validate-signal")
async def validate_signal(
    drug: str = Query(..., description="Drug name"),
    symptom: str = Query(..., description="Symptom / reaction to check"),
):
    """
    Check if a specific drug+symptom pair exists in FDA FAERS.
    Used by the pipeline's signal_validator to cross-reference signals.
    Returns match=True/False and the FAERS count if found.
    """
    search = (
        f'patient.drug.medicinalproduct:"{drug}"'
        f' AND patient.reaction.reactionmeddrapt:"{symptom}"'
    )
    params = {"search": search, "limit": 1}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OPENFDA_BASE, params=params)

        if response.status_code == 404:
            return {"drug": drug, "symptom": symptom, "match": False, "faers_count": 0}

        if response.status_code != 200:
            return {"drug": drug, "symptom": symptom, "match": False, "faers_count": 0}

        data = response.json()
        total = data.get("meta", {}).get("results", {}).get("total", 0)

        return {
            "drug": drug,
            "symptom": symptom,
            "match": total > 0,
            "faers_count": total,
            "source": "FDA FAERS",
        }

    except Exception:
        # Non-fatal — return no match rather than crashing the pipeline
        return {"drug": drug, "symptom": symptom, "match": False, "faers_count": 0}
