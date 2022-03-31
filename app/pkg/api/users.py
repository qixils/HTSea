from http import HTTPStatus

import fastapi
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
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


@route.get("/cookie")
async def retcookie():  # TODO: remove in production
    content = "<b>your mother was a hamster and your father smelt of elderberries</b>"
    response = fastapi.responses.HTMLResponse(content=content)
    response.set_cookie(key="session", value="AABBBCB")
    return response


# flow for starting from discord auth url
@route.get("/register", response_class=fastapi.responses.HTMLResponse)
async def register(user_req: Request,
                   user_resp: Response,
                   http_client: aiohttp.ClientSession = Depends(httpClient),
                   words: Wordlist = Depends(Wordlist),
                   code: typing.Optional[str] = None):
    if user_req.cookies.get("webToken"):
        user_resp.status_code = HTTPStatus.BAD_REQUEST
        return "You are already logged in. Try logging out by clearing your cookies for this site."

    try:
        # TODO: janky way to set a redirect URI
        res = await get_user_auth_data(http_client, code, os.getenv("API_URL_PREFIX") + user_req.scope['path'])
    except ApiException as e:
        user_resp.status_code = e.status_code
        return e.message

    # TODO: be more careful passing res into SQL
    res['minecraft_secret'] = gen_mc_secret()
    res['wordle_word'] = random.choice(words.get_list())
    await db.execute("INSERT INTO users (snowflake, name, discriminator, avatar, accesstoken, refreshtoken, webToken,"
                     " minecraftSecret, wordleWord) VALUES (:id, :username, :discriminator, :avatar, :accesstoken, "
                     ":refreshtoken, :secret, :minecraft_secret, :wordle_word) "
                     "ON CONFLICT (snowflake)"
                     "DO UPDATE SET (name, discriminator, avatar, accesstoken, refreshtoken, webToken, minecraftSecret) = "
                     "(EXCLUDED.name, EXCLUDED.discriminator, EXCLUDED.avatar, EXCLUDED.accesstoken, EXCLUDED.refreshtoken,"
                     "EXCLUDED.webToken, EXCLUDED.minecraftSecret);", res)
    content = f"<h1>You're now registered with code {res['minecraft_secret']}, input it into minecraft ig now</h1>"
    response = HTMLResponse(content=content)
    response.set_cookie(key="webToken", value=res['secret'])
    return response


# flow for starting from in minecraft - continued from ../main.py::connect_minecraft_acct()
# DRY rolling in its grave
@route.get("/registermc")
async def register_mc(user_req: Request,
                      user_resp: Response,
                      http_client: aiohttp.ClientSession = Depends(httpClient),
                      code: typing.Optional[str] = None):
    if user_req.cookies.get("webToken"):
        user_resp.status_code = HTTPStatus.BAD_REQUEST
        return "You are already logged in. Try logging out by clearing your cookies for this site."

    try:
        # TODO: janky way to set a redirect URI
        res = await get_user_auth_data(http_client, code, os.getenv("API_URL_PREFIX") + user_req.scope['path'])
    except ApiException as e:
        user_resp.status_code = e.status_code
        return e.message

    res['minecraft'] = user_req.cookies.get("mcuuid")
    await db.execute("INSERT INTO users (snowflake, name, discriminator, avatar, "
                     "accesstoken, refreshtoken, webToken, minecraft) VALUES "
                     "(:id, :username, :discriminator, :avatar, :accesstoken, :refreshtoken, :secret, :minecraft)",
                     res)
    await db.execute("DELETE FROM queue WHERE mcuuid=:mcuuid", {"mcuuid": res['minecraft']})
    content = f"<h1>You're now registered!</h1>"
    response = HTMLResponse(content=content)
    response.set_cookie(key="webToken", value=res['secret'])
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
    uuid = req.query_params['uuid']
    diamonds = req.query_params['diamonds']
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


@route.get("/session")
async def get_session(req: Request):
    user = await get_session_data(req)
    res_data = {
        'logged_in': user is not None
    }
    if user is not None:
        # don't tell the user what word they need to guess
        del user['wordleword']
        res_data['user'] = user
    return JSONResponse(content=jsonable_encoder(res_data))
