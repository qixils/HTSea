import api from '../util/api';
import {setError} from './error';
import {setDiamonds} from './diamonds';

export const MESSAGE_IDLE = 'MESSAGE_IDLE';
export const MESSAGE_UPDATING = 'MESSAGE_UPDATING';
export const MESSAGE_SUCCESS = 'MESSAGE_SUCCESS';
export const MESSAGE_ERROR = 'MESSAGE_ERROR';

function messageUpdating() {
    return {
        type: MESSAGE_UPDATING
    }
}

function messageSuccess(data) {
    return {
        type: MESSAGE_SUCCESS,
        data
    }
}

function messageError(error) {
    return {
        type: MESSAGE_ERROR,
        error
    }
}

export const initialState = {
    status: MESSAGE_IDLE
};

const messageReducer = (state, action) => {
    switch (action.type) {
        case MESSAGE_IDLE:
        case MESSAGE_UPDATING: {
            return {
                ...state,
                message: {
                    ...state.message,
                    status: action.type
                }
            }
        }
        case MESSAGE_SUCCESS: {
            return {
                ...state,
                message: {
                    ...state.message,
                    error: null,
                    status: action.type,
                    data: action.data
                }
            }
        }
        case MESSAGE_ERROR: {
            return {
                ...state,
                message: {
                    ...state.message,
                    status: action.type,
                    error: action.error
                }
            }
        }
        default: return state;
    }
}

const getMessage = (dispatch, id) => {
    dispatch(messageUpdating());
    api(`/api/messages/${id}`)
        .then(res => {
            dispatch(messageSuccess(res));
        })
        .catch(err => {
            dispatch(messageError(err));
        });
};

const buyMessage = (dispatch, id) => {
    dispatch(messageUpdating());
    api(`/api/messages/${id}/buy`, {method: 'post'})
        .then(res => {
            dispatch(setDiamonds(res.newDiamonds));
            getMessage(dispatch, id);
        })
        .catch(err => {
            dispatch(messageError(err));
        });
};

const sellMessage = (dispatch, id, price) => {
    dispatch(messageUpdating());
    api(`/api/messages/${id}/sell`, {
        method: 'post',
        body: JSON.stringify({price})
    })
        .then(res => {
            getMessage(dispatch, id);
        })
        .catch(err => {
            dispatch(setError(err));
            getMessage(dispatch, id);
        });
};

const cancelMessageSale = (dispatch, id, price) => {
    dispatch(messageUpdating());
    api(`/api/messages/${id}/cancel_sale`, {method: 'post'})
        .then(res => {
            getMessage(dispatch, id);
        })
        .catch(err => {
            dispatch(setError(err));
            getMessage(dispatch, id);
        });
};

export {messageReducer, getMessage, buyMessage, sellMessage, cancelMessageSale};
