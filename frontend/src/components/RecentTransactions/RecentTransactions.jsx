import style from './style.module.scss';

import {useState} from 'react';
import {Link} from 'react-router-dom';

import Avatar from '../Avatar/Avatar';
import {BlueButton} from '../Sea/SeaButton';

import api from '../../util/api';
import Diamonds from '../Diamonds/Diamonds';

const TX_LIMIT = 10;

const inlineUser = user => ( user ?
    <Link to={`/user/${user.id}`}>
        <span className={style.user}>
            <span className={style.avatar}>
                <Avatar size={16} user={user} />
            </span>
            <span className={style.username}> {user.name}</span>
            <span className={style.discriminator}>#{user.discriminator}</span>
        </span>
    </Link> : user
);

const TransactionFeed = (props) => {
    const [transactionBatches, setTransactionBatches] = useState(null);
    const [loading, setLoading] = useState(false);
    const [moreRemaining, setMoreRemaining] = useState(true);
    let endpoint = props.endpoint ?? "/api/recent_transactions";

    if (transactionBatches === null && !loading) {
        setLoading(true);
        api(endpoint)
        .then(res => {
            setTransactionBatches([res]);
        })
        .catch(err => {
            setTransactionBatches(null);
        })
        .finally(() => {
            setLoading(false);
        });
    }

    const transactions = [];
    const users = new Map();
    if (transactionBatches !== null) {
        for (const batch of transactionBatches) {
            transactions.push(...batch.transactions);
            for (const user of batch.users) {
                users.set(user.id, user);
            }
        }

        let lastBatch = transactionBatches[transactionBatches.length - 1];
        if (moreRemaining && lastBatch.transactions.length < TX_LIMIT) setMoreRemaining(false);
    }

    return (
        <div className={style.feed}>
            {transactions.map(tx => {
                console.log(tx.buyer, tx.seller);
                return (
                    <div className={style.transaction}>
                        {inlineUser(users.get(tx.buyer))}
                        {tx.seller ? (
                            <span> bought HTNFT <Link to={`/messages/${tx.messageID}`}>#{tx.messageID}</Link> from {inlineUser(users.get(tx.seller))} for <Diamonds width={16} inline>{tx.cost}</Diamonds></span>
                        ) : (
                            <span> minted HTNFT <Link to={`/messages/${tx.messageID}`}>#{tx.messageID}</Link></span>
                        )}
                    </div>
                )
            })}
            {moreRemaining && !loading ? 
                <BlueButton onClick={() => {
                    api(`${endpoint}?before=${transactions[transactions.length - 1].timestamp}`)
                    .then(res => {
                        setTransactionBatches([...transactionBatches, res]);
                        setLoading(false);
                    })
                    .catch(err => {
                        setLoading(false);
                    });
                }}>Load more</BlueButton>
            : null}
        </div>
    )
}
const TransactionPage = () => {
    return (
        <div className={style['recent-transactions']}>
            <h1>Recent Activity</h1>
            <TransactionFeed />
        </div>
    )
};

export default TransactionPage;
export { TransactionFeed, TransactionPage };
