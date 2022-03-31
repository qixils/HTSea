import datetime
from http import HTTPStatus
from uuid import uuid4
import json

import fastapi
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.encoders import jsonable_encoder
from ..dependencies import *

import aiohttp
import random
import typing

route = APIRouter(prefix="/api")

# TODO vary the cost of minting an HTNFT
MINT_COST = 1

@route.post("/mint_check")
async def mint_check(req: Request,
                     resp: Response):
    # TODO check if NFT already minted
    if validate_resp := validate_internal_request(req):
        return validate_resp
    data = await req.json()
    user = await get_user_data(int(data['user_id']))
    if user is None:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'USER_NOT_REGISTERED'
        }))
    row = await db.fetch_one("SELECT * FROM htnfts WHERE messageSnowflake = :id", {"id": int(data['message_id'])})
    if row is not None:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'ALREADY_MINTED'
        }))
    
    diamonds = user['diamonds']
    if diamonds < MINT_COST:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'NOT_ENOUGH_DIAMONDS',
            'user_diamonds': diamonds,
            'cost': MINT_COST
        }))

    return JSONResponse(content=jsonable_encoder({
        'success': True,
        'user_diamonds': diamonds,
        'cost': MINT_COST
    }))


@route.post("/mint_htnft")
async def mint_htnft(req: Request,
                     resp: Response):
    if validate_resp := validate_internal_request(req):
        return validate_resp
    data = await req.json()
    async with db.transaction():
        user = await get_user_data(int(data['user_id']))
        if user is None:
            return JSONResponse(content=jsonable_encoder({
                'success': False,
                'error': 'USER_NOT_REGISTERED'
            }))
        diamonds = user['diamonds']
        if diamonds < MINT_COST:
            return JSONResponse(content=jsonable_encoder({
                'success': False,
                'error': 'NOT_ENOUGH_DIAMONDS',
                'user_diamonds': diamonds,
                'cost': MINT_COST
            }))
        
        mint_time = datetime.datetime.now()
        
        await db.execute("INSERT INTO htnfts (messageSnowflake, channelSnowflake, guildSnowflake, authorSnowflake, content, mintedAt, embeds, attachments) "
                        "VALUES (:message_snowflake, :channel_snowflake, :guild_snowflake, :author_snowflake, :content, :minted_at, :embeds, :attachments)", {
                            'message_snowflake': int(data['message']['id']),
                            'channel_snowflake': int(data['message']['channelID']),
                            'guild_snowflake': int(data['message']['guildID']),
                            'author_snowflake': int(data['message']['authorID']),
                            'content': data['message']['content'],
                            'minted_at': mint_time,
                            'embeds': [json.dumps(embed) for embed in data['message']['embeds']],
                            'attachments': [int(attachment_id) for attachment_id in data['message']['attachments']]
                        })
        
        await db.execute_many("INSERT INTO referenced_users (nftID, snowflake, name, nickname, discriminator, avatar) "
                              "VALUES (:nft_id, :snowflake, :name, :nickname, :discriminator, :avatar)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(user['id']),
                                  'name': user['name'],
                                  'nickname': user['nickname'],
                                  'discriminator': user['discriminator'],
                                  # TODO save avatars
                                  'avatar': user['avatar']
                              } for user in data['users']])
        
        await db.execute_many("INSERT INTO referenced_channels (nftID, snowflake, type, name) "
                              "VALUES (:nft_id, :snowflake, :type, :name)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(channel['id']),
                                  'type': channel['type'],
                                  'name': channel['name']
                              } for channel in data['channels']])
        
        await db.execute_many("INSERT INTO referenced_roles (nftID, snowflake, name, color, position) "
                              "VALUES (:nft_id, :snowflake, :name, :color, :position)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(role['id']),
                                  'name': role['name'],
                                  'color': role['color'],
                                  'position': role['position']
                              } for role in data['roles']])
        
        await db.execute_many("INSERT INTO referenced_attachments (nftID, snowflake, url, name, height, width, spoiler) "
                              "VALUES (:nft_id, :snowflake, :url, :name, :height, :width, :spoiler)", [{
                                  'nft_id': int(data['message']['id']),
                                  'snowflake': int(attachment['id']),
                                  'url': attachment['url'],
                                  'name': attachment['name'],
                                  'height': attachment['height'],
                                  'width': attachment['width'],
                                  'spoiler': attachment['spoiler'],
                              } for attachment in data['attachments']])
        
        await db.execute("UPDATE users SET diamonds = "
                        "diamonds - :cost "
                        "WHERE snowflake = :user_id",
                        {
                            "user_id": int(data['user_id']),
                            "cost": MINT_COST
                        })
        
        await db.execute("INSERT INTO transactions (id, message, seller, buyer, cost, timestamp) "
                        "VALUES (:tid, :nft_id, NULL, :minter_id, :cost, :timestamp)", {
                            'tid': uuid4(),
                            'nft_id': int(data['message']['id']),
                            'minter_id': int(data['user_id']),
                            'cost': MINT_COST,
                            'timestamp': mint_time
                        })


    return JSONResponse(content=jsonable_encoder({
        'user_exists': True,
        'user_diamonds': user['diamonds'],
        'cost': MINT_COST
    }))

@route.get("/messages/{message_id}")
async def get_message(req: Request, resp: Response, message_id: int):
    row = await db.fetch_one("SELECT * FROM htnfts WHERE messageSnowflake = :id", {"id": message_id})
    if row is None:
        return JSONResponse(content=jsonable_encoder({
            'success': False,
            'error': 'Not Found'
        }), status_code=404)
    
    users = {str(user['snowflake']): {
        'id': str(user['snowflake']),
        'name': user['name'],
        'nickname': user['nickname'],
        'discriminator': user['discriminator'],
        'avatar': user['avatar']
    } for user in await db.fetch_all("SELECT * from referenced_users WHERE nftid = :id", {'id': message_id})}
    
    channels = {str(channel['snowflake']): {
        'id': str(channel['snowflake']),
        'type': channel['type'],
        'name': channel['name']
    } for channel in await db.fetch_all("SELECT * from referenced_channels WHERE nftid = :id", {'id': message_id})}

    roles = {str(role['snowflake']): {
        'id': str(role['snowflake']),
        'name': role['name'],
        'color': role['color'],
        'position': role['position']
    } for role in await db.fetch_all("SELECT * from referenced_roles WHERE nftid = :id", {'id': message_id})}

    attachments = {str(attachment['snowflake']): {
        'id': str(attachment['snowflake']),
        'url': attachment['url'],
        'name': attachment['name'],
        'height': attachment['height'],
        'width': attachment['width'],
        'spoiler': attachment['spoiler']
    } for attachment in await db.fetch_all("SELECT * from referenced_attachments WHERE nftid = :id", {'id': message_id})}

    message = {
        'messageID': str(row['messagesnowflake']),
        'channelID': str(row['channelsnowflake']),
        'guildID': str(row['guildsnowflake']),
        'authorID': str(row['authorsnowflake']),
        'content': row['content'],
        'mintedAt': None if row['mintedat'] is None else row['mintedat'].timestamp(),
        'currentPrice': row['currentprice'],
        'embeds': [json.loads(embed) for embed in row['embeds']],
        'attachments': [str(attachment_id) for attachment_id in row['attachments']]
    }

    payload = {
        'success': 'true',
        'message': message,
        'users': users,
        'channels': channels,
        'roles': roles,
        'attachments': attachments
    }

    return JSONResponse(content=jsonable_encoder(payload))