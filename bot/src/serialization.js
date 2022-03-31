const {Collection} = require('discord.js');

const makeUserReference = (user) => {
    return {
        id: user.id,
        name: user.username,
        nickname: null,
        discriminator: Number(user.discriminator),
        avatar: user.avatar
    };
};

const makeRoleReference = role => {
    return {
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position
    };
};

const channelTypeMap = {
    GUILD_TEXT: 0,
    DM: 1,
    GUILD_VOICE: 2,
    GROUP_DM: 3,
    GUILD_CATEGORY: 4,
    GUILD_NEWS: 5,
    GUILD_STORE: 6,
    GUILD_NEWS_THREAD: 10,
    GUILD_PUBLIC_THREAD: 11,
    GUILD_PRIVATE_THREAD: 12,
    GUILD_STAGE_VOICE: 13,
};

const makeChannelReference = channel => {
    return {
        id: channel.id,
        name: channel.name,
        type: channel.type in channelTypeMap ? channelTypeMap[channel.type] : -1
    };
};

const makeAttachmentReference = attachment => {
    return {
        id: attachment.id,
        url: attachment.url,
        name: attachment.name,
        height: attachment.height || null,
        width: attachment.width || null,
        spoiler: !!attachment.spoiler
    };
}

const serializeMessage = msg => {
    // TODO author nickname and roles
    // TODO nicknames are not working
    const users = msg.mentions.users.concat(new Collection([[msg.author.id, msg.author]])).map(user => makeUserReference(user));
    const roles = msg.mentions.roles.map(role => makeRoleReference(role));
    const channels = msg.mentions.channels.concat(new Collection([[msg.channel.id, msg.channel]])).map(channel => makeChannelReference(channel));
    return {
        message: {
            id: msg.id,
            channelID: msg.channelId,
            guildID: msg.guildId,
            authorID: msg.author.id,
            content: msg.content,
            attachments: Array.from(msg.attachments.keys()),
            embeds: msg.embeds.map(embed => embed.toJSON())
        },
        users,
        roles,
        channels,
        attachments: msg.attachments.map(attachment => makeAttachmentReference(attachment))
    };
}

module.exports = {
    makeUserReference,
    makeRoleReference,
    makeChannelReference,
    serializeMessage
};
