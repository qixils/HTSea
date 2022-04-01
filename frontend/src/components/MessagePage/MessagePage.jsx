import style from './style.module.scss';
import diamond from '../../icons/diamond.png';

import {useCallback, useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams, Link} from 'react-router-dom';  
import classNames from 'classnames';

import MessageList from '../MessageList/MessageList';
import {BlueButton, WhiteButton} from '../Sea/SeaButton';
import Modal from '../Modal/Modal';
import Loader from '../Loader/Loader';

import {getMessage, buyMessage, sellMessage, cancelMessageSale, MESSAGE_IDLE, MESSAGE_UPDATING, MESSAGE_SUCCESS} from '../../redux/message';
import {getSession, SESSION_IDLE, SESSION_PENDING, SESSION_SUCCESS} from '../../redux/session';

function Price(props) {
    return <span className={style["sale-price"]}>
        <img className={style['diamond-icon']} src={diamond} width="24" height="26" alt="Diamonds" />
        {props.price}
    </span>
}

const MessagePage = () => {
    const {id} = useParams();
    const [messageState, sessionState] = useSelector(state => [state.message, state.session]);
    const dispatch = useDispatch();
    const [buyModalOpen, setBuyModalOpen] = useState(false);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [salePrice, setSalePrice] = useState(0);
    const getMessageCallback = useCallback(() => getMessage(dispatch, id), [dispatch, id]);
    const getSessionCallback = useCallback(() => getSession(dispatch, id), [dispatch, id]);
    const buyMessageCallback = useCallback(() => {
        buyMessage(dispatch, id);
        setBuyModalOpen(false);
    }, [dispatch, id, setBuyModalOpen]);
    const sellMessageCallback = useCallback(() => {
        sellMessage(dispatch, id, salePrice);
        setSellModalOpen(false);
    }, [dispatch, id, salePrice, setSellModalOpen]);
    const cancelMessageSaleCallback = useCallback(() => cancelMessageSale(dispatch, id), [dispatch, id]);

    if (sessionState.status === SESSION_IDLE) {
        getSessionCallback();
        return <div className={style.loading}><Loader /></div>;
    }

    if (
        (messageState.status === MESSAGE_IDLE) ||
        (messageState.data?.message && messageState.data?.message.messageID !== id)
    ) {
        getMessageCallback(id);
        return <div className={style.loading}><Loader /></div>;
    }

    if (messageState.status === MESSAGE_UPDATING || sessionState.status === SESSION_PENDING) {
        return <div className={style.loading}><Loader /></div>;
    }

    if (messageState.status !== MESSAGE_SUCCESS || !messageState.data.success || sessionState.status !== SESSION_SUCCESS) {
        return <div>Error</div>
    }

    const messageData = messageState.data;
    const {message} = messageData;
    const owner = message.currentOwner;
    const {currentPrice} = messageState.data.message;

    let buySellAction = null;
    if (sessionState.session.logged_in) {
        const {user} = sessionState.session;
        if (owner.id === user.snowflake) {
            // we own this NFT
            if (currentPrice === null) {
                // NFT is not for sale; let the owner sell it
                buySellAction = <BlueButton onClick={() => setSellModalOpen(true)}>Put up for sale</BlueButton>;
            } else {
                // NFT is for sale; let the owner cancel the sale
                buySellAction = <BlueButton onClick={cancelMessageSaleCallback}>Remove from market</BlueButton>;
            }
        } else {
            // we do not own this NFT
            if (currentPrice !== null) {
                buySellAction = <BlueButton onClick={() => setBuyModalOpen(true)} disabled={user.diamonds < currentPrice}>Buy now</BlueButton>;
            }
        }
    }


    return (
        <div className={style['message-page']}>
            <Modal isOpen={buyModalOpen} onClose={() => setBuyModalOpen(false)}>
                <div className={style['modal-contents']}>
                    <div className={style['modal-row']}>Buy this message for <Price price={currentPrice}/>?</div>
                    <div className={classNames(style['modal-row'], style['modal-buttons'])}>
                        <BlueButton onClick={buyMessageCallback}>Buy</BlueButton>
                        <WhiteButton onClick={() => setBuyModalOpen(false)}>Cancel</WhiteButton>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={sellModalOpen} onClose={() => setSellModalOpen(false)}>
                <div className={style['modal-contents']}>
                    <div className={style['modal-row']}>Sale price: <input type="number" min="0" value={salePrice} onInput={event => {
                        const numVal = parseInt(event.target.value);
                        if (Number.isFinite(numVal)) {
                            setSalePrice(numVal);
                        }
                    }} /></div>
                    <div className={classNames(style['modal-row'], style['modal-buttons'])}>
                        <BlueButton onClick={sellMessageCallback}>Sell</BlueButton>
                        <WhiteButton onClick={() => setSellModalOpen(false)}>Cancel</WhiteButton>
                    </div>
                </div>
            </Modal>
            <div>
                <h1>Malignant Message #{message.messageID}</h1>
                <div className={style.owner}>Owned by <Link to={`/users/${owner.id}`}>{owner.name}#{owner.discriminator}</Link></div>
            </div>
            <MessageList messageData={messageData} />
            {currentPrice || buySellAction ?
            <div className={style["sale-wrapper"]}>
                {currentPrice !== null ?
                    <div>Current price: <Price price={currentPrice} /></div> :
                    null}
                {buySellAction}
            </div> :
            null
            }
            
            {/* transaction table here */}
        </div>
    );
};

export default MessagePage;