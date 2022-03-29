import fastapi
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from ..dependencies import *

import aiohttp
import hashlib
import json

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


@route.get("/register", response_class=fastapi.responses.HTMLResponse)
async def register(user_req: Request, http_client: aiohttp.ClientSession = Depends(httpClient), code: str = False):
    if not code:
        return "you (probably)) just visited the site not through discord/s oauth flow (or without a code ????? rly bro"
    if user_req.cookies.get("secret"):
        return "yo u already are (probably) logged in have you tried not being dumb"
    data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri
    }
    headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
    }

    res = await http_client.post("https://discord.com/api/v8/oauth2/token", data=data, headers=headers)
    if res.status != 200:
        return "dumbass (you gave a fake code u jerk (probably)"
    res = json.loads(await res.read())
    access_token = res["access_token"]
    refresh_token = res["refresh_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    res = await http_client.get("https://discord.com/api/v9/users/@me", headers=headers)
    res = json.loads(await res.read())
    secret = hashlib.md5(bytes(access_token + res["id"], "utf-8")).hexdigest()[0:10]
    avi = f"https://cdn.discordapp.com/avatars/{res['id']}/{res['avatar']}.jpg"
    res.update({"secret": secret, "avatar": avi, "accesstoken": access_token, "refreshtoken": refresh_token})
    res.update({"discriminator": int(res["discriminator"])})
    res.update({"id": int(res["id"])})
    res.pop("public_flags")
    res.pop("flags")
    res.pop("banner")
    res.pop("banner_color")
    res.pop("accent_color")
    res.pop("locale")
    res.pop("mfa_enabled")  # sqlalchemy errors if it encounters a dict key for which the query has no matching param
    print(res)
    await db.execute("INSERT INTO users (snowflake, name, discriminator, avatar, accesstoken, refreshtoken, secret) "
               "VALUES (:id, :username, :discriminator, :avatar, :accesstoken, :refreshtoken, :secret);", res)
    content = f"<h1>You're now registered with secret {secret}, input it into minecraft ig now</h1>"
    response = HTMLResponse(content=content)
    response.set_cookie(key="secret", value=secret)
    return response
    #


@route.get("/registermc")
async def register_mc(user_req: Request):
    pass


