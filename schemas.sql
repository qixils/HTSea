CREATE TABLE IF NOT EXISTS users (
    snowflake bigint PRIMARY KEY NOT NULL,
    name VARCHAR(32) NOT NULL,
    discriminator integer NOT NULL,
    avatar VARCHAR(128),
    minecraft uuid UNIQUE,
    minecraftSecret CHAR(10),
    wordleWord CHAR(5) NOT NULL,
    wordleGuesses CHAR(5)[6] NOT NULL DEFAULT ARRAY[]::CHAR(5)[],
    wordleCooldown timestamp,
    diamonds NUMERIC(8,3) NOT NULL DEFAULT 0,
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
    guildSnowflake bigint NOT NULL,
    authorSnowflake bigint NOT NULL,
    content VARCHAR(4000),
    mintedAt timestamp NOT NULL,
    currentPrice NUMERIC(8,3),
    embeds json[],
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

CREATE TABLE IF NOT EXISTS referenced_users (
    nftID bigint NOT NULL references htnfts(messageSnowflake),
    snowflake bigint NOT NULL,
    name VARCHAR(32) NOT NULL,
    nickname VARCHAR(32),
    discriminator integer NOT NULL,
    avatar VARCHAR(128) -- null if not the message author
);

CREATE TABLE IF NOT EXISTS referenced_channels (
    nftID bigint NOT NULL references htnfts(messageSnowflake),
    snowflake bigint NOT NULL,
    type int NOT NULL,
    name VARCHAR(100) NOT NULL -- yes, channel names really can be that long
);

CREATE TABLE IF NOT EXISTS referenced_roles (
    nftID bigint NOT NULL references htnfts(messageSnowflake),
    snowflake bigint NOT NULL,
    name VARCHAR(100) NOT NULL,
    color integer NOT NULL,
    position integer NOT NULL
);

CREATE TABLE IF NOT EXISTS referenced_attachments (
    nftID bigint NOT NULL references htnfts(messageSnowflake),
    snowflake bigint NOT NULL,
    url text NOT NULL,
    name text,
    height int,
    width int,
    spoiler boolean
);