import api from '../util/api';
import {setError} from './error';
import {setDiamonds} from './diamonds';

export const MESSAGE_IDLE = 'MESSAGE_IDLE';
export const MESSAGE_UPDATING = 'MESSAGE_UPDATING';
export const MESSAGE_SUCCESS = 'MESSAGE_SUCCESS';
export const MESSAGE_ERROR = 'MESSAGE_ERROR';

function messageUpdating(id) {
    return {
        type: MESSAGE_UPDATING,
        id
    }
}

function messageSuccess(data, id) {
    return {
        type: MESSAGE_SUCCESS,
        data,
        id
    }
}

function messageError(error, id) {
    return {
        type: MESSAGE_ERROR,
        error,
        id
    }
}

export const initialState = {
    status: MESSAGE_IDLE,
    id: null
};

const messageReducer = (state, action) => {
    switch (action.type) {
        case MESSAGE_IDLE:
        case MESSAGE_UPDATING: {
            return {
                ...state,
                message: {
                    ...state.message,
                    id: action.id,
                    status: action.type
                }
            }
        }
        case MESSAGE_SUCCESS: {
            return {
                ...state,
                message: {
                    ...state.message,
                    id: action.id,
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
                    id: action.id,
                    status: action.type,
                    error: action.error
                }
            }
        }
        default: return state;
    }
}

const getMessage = (dispatch, id) => {
    dispatch(messageUpdating(id));
    api(`/api/messages/${id}`)
        .then(res => {
            dispatch(messageSuccess(res, id));
        })
        .catch(err => {
            dispatch(messageError(err, id));
        });
};

const buyMessage = (dispatch, id) => {
    dispatch(messageUpdating(id));
    api(`/api/messages/${id}/buy`, {method: 'post'})
        .then(res => {
            dispatch(setDiamonds(res.newDiamonds));
            getMessage(dispatch, id);
        })
        .catch(err => {
            dispatch(messageError(err, id));
        });
};

const sellMessage = (dispatch, id, price) => {
    dispatch(messageUpdating(id));
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
    dispatch(messageUpdating(id));
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
