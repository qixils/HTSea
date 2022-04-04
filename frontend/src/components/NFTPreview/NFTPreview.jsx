import style from "./style.module.scss";

import { useState } from "react";
import api from "../../util/api";
import { Link } from "react-router-dom";
import Loader from "../Loader/Loader";
import MessageList from "../MessageList/MessageList";
import Diamonds from "../Diamonds/Diamonds";

function NFTPreview({id, priced}) {
    const [message, setMessage] = useState(null);
    const [loadState, setLoadState] = useState('idle');

    if (message === null && loadState === 'idle') {
        setLoadState('loading');
        api(`/api/messages/${id}`)
        .then(res => {
            setMessage(res);
            setLoadState('loaded');
        })
        .catch(err => {
            setMessage(null);
            setLoadState('error');
        });
    }

    return (
        <div className={style['nft-preview']}>
            <Link to={`/messages/${id}`}>
            {message === null ?
                <Loader /> :
                <div className={style['msg-wrapper']}>
                    <MessageList messageData={message} />
                    {priced ? <div className={style['price']}>
                        <Diamonds>{message.message.currentPrice}</Diamonds>
                    </div> : null}
                </div>}
            </Link>
        </div>
    );
};

export default NFTPreview;
