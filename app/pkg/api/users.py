from http import HTTPStatus

import fastapi
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.encoders import jsonable_encoder
from ..dependencies import *

import aiohttp
import random
import typing


route = APIRouter(prefix="/api/users")

httpClient = HttpClient()


@route.on_event("startup")
async def startup():
    httpClient.start()


# flow for starting from discord auth url
@route.get("/register", response_class=fastapi.responses.HTMLResponse)
async def register(user_req: Request,
                   http_client: aiohttp.ClientSession = Depends(httpClient),
                   code: typing.Optional[str] = None):
    if user_req.cookies.get("webToken"):
        return RedirectResponse(url="/", status_code=HTTPStatus.FOUND)

    try:
        # TODO: janky way to set a redirect URI
        redirect_uri = os.getenv("API_URL_PREFIX") + user_req.scope['path']
        res = await get_user_auth_data(http_client, code, redirect_uri)
    except ApiException as e:
        return JSONResponse(content=e.message, status_code=e.status_code)

    response = RedirectResponse(url="/", status_code=HTTPStatus.FOUND)
    if res['cookie']:
        response.set_cookie(**res['cookie'])
    return response


# flow for starting from in minecraft - continued from ../main.py::connect_minecraft_acct()
# DRY rolling in its grave
@route.get("/registermc")
async def register_mc(user_req: Request,
                      http_client: aiohttp.ClientSession = Depends(httpClient),
                      code: typing.Optional[str] = None):
    try:
        # TODO: janky way to set a redirect URI
        redirect_uri = os.getenv("API_URL_PREFIX") + user_req.scope['path']
        res = await get_user_auth_data(http_client, code, redirect_uri)
    except ApiException as e:
        return JSONResponse(content=e.message, status_code=e.status_code)

    by_snowflake = await db.fetch_one("SELECT minecraft FROM users WHERE snowflake=:id",
                                      {'id': res['id']})
    if by_snowflake and by_snowflake['minecraft']:
        return HTMLResponse(content=f"<h1>You have already connected a Minecraft account!</h1>",
                            status_code=HTTPStatus.BAD_REQUEST)
    by_uuid = await db.fetch_one("SELECT * FROM users WHERE minecraft=:uuid", {'uuid': res['uuid']})
    if by_uuid:
        return HTMLResponse(content=f"<h1>That Minecraft account is already registered!</h1>",
                            status_code=HTTPStatus.BAD_REQUEST)

    await db.execute("UPDATE users SET minecraft=:uuid WHERE snowflake=:id", {'uuid': res['uuid'],
                                                                              'id': res['id']})
    response = HTMLResponse(content=
                            f"<h1>You have successfully connected your Minecraft account!</h1>")
    if res['cookie']:
        response.set_cookie(**res['cookie'])
    return response


@route.get("/mc/secret")
async def get_secret(req: Request):
    if validate_resp := validate_internal_request(req):
        return validate_resp
    if 'uuid' not in req.query_params:
        return JSONResponse({'error': 'The uuid query parameter is required.'},
                            HTTPStatus.BAD_REQUEST)
    uuid = req.query_params['uuid']
    uuid_map = {"uuid": uuid}
    if await db.fetch_one("SELECT * FROM users WHERE minecraft=:uuid", uuid_map):
        return {'secret': None}
    queue = await db.fetch_one("SELECT secret FROM queue WHERE mcuuid=:uuid", uuid_map)
    if not queue:
        queue = {'mcuuid': uuid, 'secret': gen_mc_secret()[:5]}
        await db.execute("INSERT INTO queue (mcuuid, secret) VALUES (:mcuuid, :secret)", queue)
    return {'secret': queue['secret']}


@route.get("/mc/profile")
async def get_profile_by_uuid(req: Request):
    if validate_resp := validate_internal_request(req):
        return validate_resp
    if 'uuid' not in req.query_params:
        return JSONResponse({'error': 'The uuid query parameter is required.'},
                            HTTPStatus.BAD_REQUEST)
    uuid = req.query_params['uuid']
    profile = await db.fetch_one("SELECT * FROM users WHERE minecraft=:uuid", {'uuid': uuid})
    if not profile:
        return JSONResponse({'error': 'The requested profile could not be found.'},
                            HTTPStatus.NOT_FOUND)
    return profile


@route.post("/mc/add_diamonds")
async def add_diamonds(req: Request):
    if validate_resp := validate_internal_request(req):
        return validate_resp
    payload = await req.json()
    if 'uuid' not in payload:
        return JSONResponse({'error': 'The uuid parameter is required.'},
                            HTTPStatus.BAD_REQUEST)
    if 'diamonds' not in payload:
        return JSONResponse({'error': 'The diamonds parameter is required.'},
                            HTTPStatus.BAD_REQUEST)
    uuid = payload['uuid']
    diamonds = payload['diamonds']
    profile = await db.fetch_one("SELECT * FROM users WHERE minecraft=:uuid", {'uuid': uuid})
    if not profile:
        return JSONResponse({'error': 'The requested profile could not be found.'},
                            HTTPStatus.NOT_FOUND)
    profile['diamonds'] += diamonds
    if profile['diamonds'] < 0:
        # TODO use fixed error IDs (an int enum) so this is easier for the plugin to parse?
        return JSONResponse({'error': "Attempted to withdrawal more diamonds than available in user's account."},
                            HTTPStatus.BAD_REQUEST)
    await db.execute("UPDATE users SET diamonds=:diamonds WHERE minecraft=:uuid", profile)
    return profile


@route.post("/mc/{user_id}/add_diamonds/{diamonds}")
async def add_diamonds(req: Request, user_id: int, diamonds: int):
    if validate_resp := validate_internal_request(req):
        return validate_resp
    profile = dict(await db.fetch_one("SELECT * FROM users WHERE snowflake=:id", {'id': user_id}))
    if not profile:
        return JSONResponse({'error': 'The requested profile could not be found.'},
                            HTTPStatus.NOT_FOUND)
    profile['diamonds'] += diamonds
    if profile['diamonds'] < 0:
        # TODO use fixed error IDs (an int enum) so this is easier for the plugin to parse? (GH#4)
        return JSONResponse({'error': "Attempted to withdrawal more diamonds than available in user's account."},
                            HTTPStatus.BAD_REQUEST)
    await db.execute("UPDATE users SET diamonds=:diamonds WHERE snowflake=:id",
                     {'diamonds': profile['diamonds'], 'id': user_id})
    return profile


@route.get("/session")
async def get_session(req: Request):
    user = await get_session_data(req)
    res_data = {
        'logged_in': user is not None
    }
    if user is not None:
        # don't tell the user what word they need to guess
        del user['wordleword']
        user['snowflake'] = str(user['snowflake'])
        res_data['user'] = user
    return JSONResponse(content=jsonable_encoder(res_data))

@route.get("/{user_id}")
async def get_user(req: Request, resp: Response, user_id: int):
    user = await get_user_profile_data(user_id)
    if user is None:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'Not Found'
        }), status_code=404)
    
    user['htnftIDs'] = [str(row['messagesnowflake']) for row in
        await db.fetch_all("SELECT messageSnowflake from htnfts WHERE currentOwner = :id ORDER BY mintedAt", {'id': user_id})]

    payload = {
        'success': 'true',
        'user': user
    }

    return JSONResponse(content=jsonable_encoder(payload))
