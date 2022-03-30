from http import HTTPStatus

import fastapi
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse
from ..dependencies import *

import aiohttp
import typing


route = APIRouter(prefix="/api/users")

httpClient = HttpClient()


@route.on_event("startup")
async def startup():
    httpClient.start()


@route.get("/cookie")
async def retcookie():
    content = "<b>your mother was a hamster and your father smelt of elderberries</b>"
    response = fastapi.responses.HTMLResponse(content=content)
    response.set_cookie(key="session", value="AABBBCB")
    return response


# flow for starting from discord auth url
@route.get("/register", response_class=fastapi.responses.HTMLResponse)
async def register(user_req: Request,
                   user_resp: Response,
                   http_client: aiohttp.ClientSession = Depends(httpClient),
                   code: typing.Optional[str] = None):
    if user_req.cookies.get("webToken"):
        user_resp.status_code = HTTPStatus.BAD_REQUEST
        return "You are already logged in. Try logging out by clearing your cookies for this site."

    try:
        res = await get_user_data(http_client, code)
    except ApiException as e:
        user_resp.status_code = e.status_code
        return e.message

    # TODO: be more careful passing res into SQL
    res['minecraft_secret'] = gen_mc_secret()
    await db.execute("INSERT INTO users (snowflake, name, discriminator, avatar, accesstoken, refreshtoken, webToken,"
                     " minecraftSecret) VALUES (:id, :username, :discriminator, :avatar, :accesstoken, "
                     ":refreshtoken, :secret, :minecraft_secret) "
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
        res = await get_user_data(http_client, code, "http://localhost:8000/api/users/registermc")
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


@route.get("/secret")
async def get_secret(req: Request, resp: Response):
    if 'Authorization' not in req.headers:
        resp.status_code = HTTPStatus.UNAUTHORIZED
        return {'error': 'This internal endpoint requires a secret token.'}
    if req.headers['Authorization'] != "Bearer " + os.getenv('MC_SECRET'):
        resp.status_code = HTTPStatus.FORBIDDEN
        return {'error': 'The provided secret token is invalid.'}
    if 'uuid' not in req.query_params:
        resp.status_code = HTTPStatus.BAD_REQUEST
        return {'error': 'The uuid query parameter is required.'}
    uuid = req.query_params['uuid']
    uuid_map = {"uuid": uuid}
    if await db.fetch_one("SELECT * FROM users WHERE minecraft=:uuid", uuid_map):
        resp.status_code = HTTPStatus.BAD_REQUEST
        return {'error': 'The provided uuid is already registered.'}
    queue = await db.fetch_one("SELECT secret FROM queue WHERE mcuuid=:uuid", uuid_map)
    if not queue:
        queue = {'mcuuid': uuid, 'secret': gen_mc_secret()[:5]}
        await db.execute("INSERT INTO queue (mcuuid, secret) VALUES (:mcuuid, :secret)", queue)
    return {'secret': queue['secret']}
