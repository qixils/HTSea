import style from './style.module.scss';

import {useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {useParams} from 'react-router-dom';

import Avatar from '../Avatar/Avatar';
import Loader from '../Loader/Loader';
import Diamonds from '../Diamonds/Diamonds';
import ErrorPage from '../ErrorPage/ErrorPage';
import Paginator from '../Paginator/Paginator';
import {TransactionFeed} from '../RecentTransactions/RecentTransactions';

import {getUser, USER_IDLE, USER_UPDATING, USER_SUCCESS} from '../../redux/user';
import NFTPreview from '../NFTPreview/NFTPreview';

const UserPage = () => {
    const {id} = useParams();
    const userState = useSelector(state => state.user);
    const dispatch = useDispatch();
    const getUserCallback = useCallback(() => getUser(dispatch, id), [dispatch, id]);

    if (
        (userState.status === USER_IDLE) ||
        (userState.id !== id)
    ) {
        getUserCallback(id);
        return <div className={style.loading}><Loader /></div>;
    }

    if (userState.status === USER_UPDATING) {
        return <div className={style.loading}><Loader /></div>;
    }

    if (userState.status !== USER_SUCCESS) {
        return <ErrorPage error={userState.error} />
    }

    const userData = userState.data;
    const {user} = userData;

    return (
        <div className={style['user-page']}>
            <div className={style['user-header']}>
                <span className={style.avatar}>
                    <Avatar user={user} size={96} />
                </span>
                <span className={style.username}>{user.name}</span>
                <span className={style.discriminator}>#{user.discriminator}</span>
                <span className={style.balance}>
                    <Diamonds>{user.diamonds}</Diamonds>
                </span>
            </div>
            <div className={style.col0}>
                {user.htnftIDs.length > 0 ?
                    <Paginator
                        items={user.htnftIDs}
                        pageSize={5}
                        header="This user's HTNFTs:"
                        body={items => (
                            <div className={style.htnfts}>
                                {items.map(id => <NFTPreview id={id} key={id} />)}
                            </div>)
                        }
                    /> :
                    "This user doesn't own any HTNFTs."
                }
                <div>
                    <h2>This user's recent transactions:</h2>
                    <TransactionFeed endpoint={`/api/recent_transactions/user/${id}`} />
                </div>
            </div>
        </div>
    );
};

export default UserPage;
