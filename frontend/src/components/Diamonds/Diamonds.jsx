import style from './style.module.scss';
import diamond from '../../icons/diamond.png';

function Diamonds({diamonds}) {
    return <span className={style.diamonds}>
        <img className={style['diamond-icon']} src={diamond} width="24" height="26" alt="Diamonds" />
        {diamonds}
    </span>
}

export default Diamonds;
