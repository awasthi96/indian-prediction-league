# app/services/icc_client.py

import math
import httpx

ICC_CLIENT_ID = "tPZJbRgIub3Vua93/DWtyQ=="
ICC_BASE_URL = "https://assets-icc.sportz.io/cricket/v1/game/commentary"


async def fetch_inning(client: httpx.AsyncClient, game_id: int, inning: int):

    params = {
        "client_id": ICC_CLIENT_ID,
        "feed_format": "json",
        "game_id": game_id,
        "inning": inning,
        "lang": "en",
        "page_number": 1,
        "page_size": 20
    }

    first = await client.get(ICC_BASE_URL, params=params)
    first.raise_for_status()
    first_json = first.json()

    total_count = first_json["meta"]["count"]
    page_size = 20
    total_pages = math.ceil(total_count / page_size)

    commentary = first_json["data"]["Commentary"]

    for page in range(2, total_pages + 1):
        params["page_number"] = page
        res = await client.get(ICC_BASE_URL, params=params)
        res.raise_for_status()
        commentary.extend(res.json()["data"]["Commentary"])

    return commentary


async def fetch_full_match(game_id: int):

    async with httpx.AsyncClient(timeout=10) as client:
        inning1 = await fetch_inning(client, game_id, 1)
        inning2 = await fetch_inning(client, game_id, 2)

    return inning1, inning2


ICC_SCORECARD_URL = "https://assets-icc.sportz.io/cricket/v1/game/scorecard"

async def fetch_scorecard(client: httpx.AsyncClient, game_id: int):
    params = {
        "client_id": ICC_CLIENT_ID,
        "feed_format": "json",
        "game_id": game_id,
        "lang": "en"
    }

    res = await client.get(ICC_SCORECARD_URL, params=params)
    res.raise_for_status()
    return res.json()["data"]

async def fetch_match_data(game_id: int):

    async with httpx.AsyncClient(timeout=10) as client:
        scorecard = await fetch_scorecard(client, game_id)

    return scorecard