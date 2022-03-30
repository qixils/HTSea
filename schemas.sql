CREATE TABLE IF NOT EXISTS users (
    snowflake bigint PRIMARY KEY NOT NULL,
    name VARCHAR(32) NOT NULL,
    discriminator integer NOT NULL,
    avatar VARCHAR(128),
    minecraft uuid UNIQUE,
    minecraftSecret CHAR(10),
    wordleWord CHAR(5),
    wordleGuesses CHAR(5)[6],
    wordleCooldown timestamp,
    diamonds NUMERIC(8,3),
    accessToken VARCHAR(2048),
    refreshToken VARCHAR(512),
    webToken CHAR(10),
    csrfToken CHAR(10),
    csrfExpiry time
);

CREATE TABLE IF NOT EXISTS QUEUE (
    mcuuid uuid PRIMARY KEY NOT NULL,
    secret CHAR(5)
);

CREATE TABLE IF NOT EXISTS htnfts (
    messageSnowflake bigint PRIMARY KEY NOT NULL,
    channelSnowflake bigint NOT NULL,
    channelName VARCHAR(100),
    guildSnowflake bigint NOT NULL,
    authorSnowflake bigint NOT NULL references users(snowflake),
    authorName VARCHAR(32) NOT NULL,
    authorAvatar VARCHAR(128),
    content VARCHAR(4000),
    mintedAt timestamp NOT NULL,
    currentPrice NUMERIC(8,3),
    reactions bigint[],
    embeds bigint[],
    attachments bigint[]
);

--  ^^^ reactions id
-- wait nvm i dont need to use those fields bc the table stores them by id anyways

CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY NOT NULL,
    message bigint references htnfts(messageSnowflake),
    seller bigint references users(snowflake),
    buyer bigint references users(snowflake),
    cost NUMERIC(8,3),
    timestamp timestamp
);
--  ^^^ id is md5(all other trans data)

CREATE TABLE IF NOT EXISTS guilds (
    snowflake bigint PRIMARY KEY NOT NULL,
    name VARCHAR(100),
    icon VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS offers (
    id bigint NOT NULL references htnfts(messageSnowflake),
    buyer bigint references users(snowflake),
    price NUMERIC(8,3),
    timestamp timestamp
);

CREATE TABLE IF NOT EXISTS snapshots (
    hash uuid PRIMARY KEY,
    snowflake bigint,
    authorName VARCHAR(32),
    authorNickname VARCHAR(32),
    authorDiscrim integer
);
--  ^^^ hash is md5(all other snapshot data)
--  snapshots are frozen user data attached to a tx or htnft (for display purposes)

CREATE TABLE IF NOT EXISTS reactions (
    id bigint NOT NULL references htnfts(messageSnowflake),
    reactor bigint NOT NULL references users(snowflake),
    snapshot uuid references snapshots(hash)
);
--  ^^^ id is id of the reacted-to message

CREATE TABLE IF NOT EXISTS attachments (
    id bigint NOT NULL references htnfts(messageSnowflake),
    urls text[]
);

CREATE TABLE IF NOT EXISTS embeds (
    id bigint NOT NULL references htnfts(messageSnowflake),
    data json[]
);