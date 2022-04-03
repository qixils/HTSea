import style from './style.module.scss';

import {Component, useState} from 'react';
import {connect} from 'react-redux';
import {Link} from 'react-router-dom';
import classNames from 'classnames';

import Avatar from '../Avatar/Avatar';

import { Dropdown, Input, WhiteButton } from '../Sea/UI';
import api from '../../util/api';
import Paginator from '../Paginator/Paginator';
import Loader from '../Loader/Loader';
import MessageList from '../MessageList/MessageList';
import Diamonds from '../Diamonds/Diamonds';
import {NFTPreviewPriced} from '../NFTPreview/NFTPreview';

function Marketplace() {
    const [sort, setSort] = useState("none");
    const [prMin, setPRMin] = useState(-1);
    const [prMax, setPRMax] = useState(-1);
    const [priceRange, setPriceRange] = useState([-1, -1]);
    const [msgIDs, setMsgIDs] = useState(null);
    const [loading, setLoading] = useState(false);

    if (msgIDs == null && !loading) {
        setLoading(true);
        api(`/api/marketplace_messages?sort=${sort}&min=${priceRange[0]}&max=${priceRange[1]}`)
        .then(res => {
            setMsgIDs(res.ids);
        })
        .catch(err => {
            setMsgIDs([]);
        })
        .finally(() => {
            setLoading(false);
        });
    }
    
    return (<div className={style.marketplace}>
        <h1>Marketplace</h1>
        <div className={style.filters}>
            <div>
                <span>Price: </span>
                <Input 
                    className={style["input-boxes"]} 
                    type="number" 
                    placeholder="Min" 
                    min={0} 
                    onInput={e => {
                        let v = e.target.value;
                        setPRMin(v === "" ? -1 : +v);
                    }}/>
                <span> to </span>
                <Input 
                    className={style["input-boxes"]} 
                    type="number" 
                    placeholder="Max" 
                    min={0} 
                    onInput={e => {
                        let v = e.target.value;
                        setPRMax(v === "" ? -1 : +v);
                    }}/>
                <WhiteButton 
                    className={style["apply-button"]} 
                    disabled={prMin !== -1 && prMax !== -1 && prMin > prMax} 
                    onClick={e => {setPriceRange([prMin, prMax]); setMsgIDs(null);}}>
                        Apply
                </WhiteButton>
            </div>
            <div>
                <Dropdown defaultValue="none" onChange={e => {setSort(e.target.value); setMsgIDs(null);}}>
                    <option value="none" disabled hidden>Sort by</option>
                    <option value="pricelh">Price: Low to High</option>
                    <option value="pricehl">Price: High to Low</option>
                    <option value="new">Recently Listed</option>
                    <option value="old">Oldest</option>
                </Dropdown>
            </div>
        </div>
        {msgIDs?.length > 0 ?
            <Paginator
                items={msgIDs}
                pageSize={5}
                header="For sale:"
                body={items => (
                    <div className={style.htnfts}>
                        {items.map(id => <NFTPreviewPriced id={id} key={id} />)}
                    </div>)
                }
            /> :
            "No HTNFTs found."
        }
    </div>)

}

export default Marketplace;