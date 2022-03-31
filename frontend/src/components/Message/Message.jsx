import style from './style.module.scss';

import {Component} from 'react';
import {connect} from 'react-redux';
import {useParams, Link} from 'react-router-dom';
import classNames from 'classnames';

import api from '../../util/api';

// TODO replace this with actual api call
function getMessage(id) {
    return {
        "message": {
            "id": "12345",
            "channel_id": "54321",
            "guild_id": "65432",
            "author_id": "98765",
            "content": "i am pinging <@99999>"
        },
        "channels": {
            "54321": {
                "name": "unserious",
                "type": 0
            }
        },
        "users": {
            "98765": {
                "name": "ysrutnsrytunrs",
                "discriminator": "1291"
            },
            "99999": {
                "name": "usnysrutkrse",
                "discriminator": "4140"
            }
        }
    }
}

function Button(props) {
    return <button className={style["nftbutton"]} onClick={props.click}>{props.content}</button>;
}

function Message() {
    let { id } = useParams();
    let { message, channels, users } = getMessage(id);

    return (
        <div id={style["head"]}>
            <div>
                <h1>Malignant Message #{message.id}</h1>
                <div className={style["author"]}>Owned by <Link to={`/user/${message.author_id}`}>{users[message.author_id].name}#{users[message.author_id].discriminator}</Link></div>
            </div>
            <div className={style["message"]}>{message.content}</div>
            {/* i thiiiiink it's Make offer OR Buy Price & Buy It Now, not both at the same time??? */}
            <div>
                <Button onClick={()=>{}} content="Make offer" />
            </div>
            {/* transaction table here */}
        </div>
    );
}
export default Message;