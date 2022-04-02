class APIError extends Error {
    constructor (message, type, status) {
        super(message);
        this.type = type;
        this.name = 'APIError';
        this.status = status;
    }

    toString () {
        return `${this.name} (status ${this.status}): ${this.type}` + (this.message ? ` (${this.message})` : '');
    }
}

const api = (route, opts = {}) => {
    const {params, ...otherOpts} = opts;
    let url = process.env.REACT_APP_API_URL + route;
    if (params) {
        url += '?';
        url += new URLSearchParams(params).toString();
    }
    return fetch(
        url,
        // include credentials by default
        Object.assign({credentials: 'include'}, otherOpts)
    )
    .then(async res => {
        let json = await res.json();
        if (!res.ok) {
            throw new APIError(json.comment || res.statusText, json.error, res.status);
        }
        return json;
    });
};

export default api;
