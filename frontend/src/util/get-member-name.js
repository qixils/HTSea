const getMemberName = (memberID, messageData, prefixWithAt = false, isMember = true) => {
    if (!(memberID in messageData.users)) {
        return `<@${memberID}>`;
    }
    const prefix = prefixWithAt ? '@' : '';
    const user = messageData.users[memberID];
    if (user && user.nickname !== null) return prefix + user.nickname;
    return prefix + user.name;
};

export default getMemberName;