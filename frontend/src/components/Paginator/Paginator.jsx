import style from './style.module.scss';

import {useState} from 'react';
import classNames from 'classnames';

const Paginator = ({header, body, items, pageSize}) => {
    const [page, setPage] = useState(0);
    const isFirstPage = page === 0;
    const isLastPage = page >= Math.ceil(items.length / pageSize) - 1;

    return (
        <div className={style.paginator}>
            <div className={style['paginator-top']}>
                <h2 className={style.header}>{header}</h2>
                <div className={style['page-selector']}>
                    <button
                        className={classNames(style.prev, style['page-button'])}
                        onClick={() => !isFirstPage && setPage(page - 1)}
                        disabled={isFirstPage}>←</button>
                    <div className={style['page-number']}>{items.length > 0 ? page + 1 : 0}/{Math.ceil(items.length / pageSize)}</div>
                    <button
                        className={classNames(style.next, style['page-button'])}
                        onClick={() => !isLastPage && setPage(page + 1)}
                        disabled={isLastPage}>→</button>
                </div>
            </div>
            {body(items.slice(page * pageSize, (page + 1) * pageSize))}
        </div>
    )
}

export default Paginator;
