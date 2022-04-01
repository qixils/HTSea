import style from './style.module.scss';
import diamond from '../../icons/diamond.png';

import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams, Link} from 'react-router-dom';  
import cls from 'classnames';
import MessageList from '../MessageList/MessageList';

import {MESSAGE_IDLE, getMessage, MESSAGE_UPDATING, MESSAGE_SUCCESS} from '../../redux/message';

function Button(props) {
    return (<button 
            className={cls(style.nftbutton, {[style.nbb]: props.invert, [style.nbw]: !props.invert})}
            onClick={props.onClick}
            >
                {props.content}
        </button>);
}

function Price(props) {
    return <div className={style["sale-price"]}>
        <img className={style['diamond-icon']} src={diamond} width="24" height="26" alt="Diamonds" />
        {props.price}
    </div>
}

function BuyButton(props) {
    let {msg} = props;
    return <div className={style["sale-wrapper"]}>
        {msg.currentPrice != null ?
         <>
            <div>Current price</div>
            <Price price={msg.currentPrice} />
         </> :
         <>
            <div>Highest offer</div>
            <Price price="TODO" />
         </>
    }
        <div className={style["nftbutton-wrapper"]}>
            {(msg.currentPrice != null) ? 
            <Button invert={true} content="Buy now" /> : null}
            <Button content="Make offer" />
        </div>
    </div>;
}

const MessagePage = () => {
    const {id} = useParams();
    const messageState = useSelector(state => state.message);
    const dispatch = useDispatch();
    const getMessageCallback = useCallback(() => getMessage(dispatch, id), [dispatch, id]);

    console.log(messageState);

    if (
        (messageState.status === MESSAGE_IDLE) ||
        (messageState.data?.message && messageState.data?.message.messageID !== id)
    ) {
        getMessageCallback(id);
        return <div>TODO: LOADING</div>;
    }

    if (messageState.status === MESSAGE_UPDATING) {
        return <div>TODO: LOADING</div>
    }

    if (messageState.status !== MESSAGE_SUCCESS || !messageState.data.success) {
        return <div>TODO: ERROR</div>
    }

    const messageData = messageState.data;
    let {message, users} = messageData;

    return (
        <div className={style['message-page']}>
            <div>
                <h1>Malignant Message #{message.messageID}</h1>
                <div className={style["author-header"]}>Owned by <Link to={`/users/${message.authorID}`}>{users[message.authorID].name}#{users[message.authorID].discriminator}</Link></div>
            </div>
            <MessageList messageData={messageData} />
            <BuyButton msg={message} />
            {/* transaction table here */}
        </div>
    );
};

export default MessagePage;