import style from './style.module.scss';

const Avatar = ({user, size}) => {
    if (!user) return `https://cdn.discordapp.com/embed/avatars/0.png`;
    if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator) % 5}.png`;
    // test if handed an avatar hash directly
    let avatarHashMatch = /^([a-z0-9]+)$/.exec(user.avatar);
    if (!avatarHashMatch) {
        // extract avatar hash from CDN URL
        avatarHashMatch = /^https?:\/\/cdn\.discordapp\.com\/avatars\/\d+\/([a-z0-9]+)\.[a-z]+$/.exec(user.avatar);
    }
    if (!avatarHashMatch) {
        return user.avatar;
    }
    const avatarHash = avatarHashMatch[1];
    const avatarURL = `https://cdn.discordapp.com/avatars/${user.id || user.snowflake}/${avatarHash}.webp?size=${size}`;

    return (
        <img
            className={style['avatar']}
            src={avatarURL}
            width={size}
            height={size}
            style={({width: size, height: size})}
            alt="Avatar"
        />
    );
}

export default Avatar;
