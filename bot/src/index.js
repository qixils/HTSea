const {REST} = require('@discordjs/rest');
const {Routes, ApplicationCommandType, GatewayIntentBits} = require('discord-api-types/v9');
const {ContextMenuCommandBuilder} = require('@discordjs/builders');
const {Client, MessageActionRow, MessageButton, MessageMentions} = require('discord.js');
const client = new Client({intents: [GatewayIntentBits.Guilds]});
const axios = require('axios');
const fs = require('fs');

const TimedMap = require('./timed-map');
const {serializeMessage} = require('./serialization');

const b = new ContextMenuCommandBuilder()
	.setType(ApplicationCommandType.Message)
	.setName("Mint HTNFT");

const commands = [b];

const clientId = process.env.CLIENT_ID;

const rest = new REST({version: '9'}).setToken(process.env.BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			Routes.applicationCommands(clientId),
			{body: commands},
		);

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
});

const mintInteractions = new TimedMap();

const errorToMessage = data => {
	switch (data.error) {
		case 'USER_NOT_REGISTERED': {
			return 'You don\'t seem to have registered an HTSea account.';
		}
		case 'ALREADY_MINTED': {
			return 'This message has already been minted.';
		}
		case 'NOT_ENOUGH_DIAMONDS': {
			return `Minting the message would cost **${data.cost} diamonds**, and your current balance is only **${data.user_diamonds} diamonds**.`;
		}
	}
}

const completeMint = async interaction => {
	const origInteraction = mintInteractions.get(interaction.message.interaction.id);
	if (!origInteraction) {
		await interaction.update({content: 'Timed out', components: []});
		return;
	}
	const msg = origInteraction.targetMessage;
	const payload = serializeMessage(msg);
	payload.user_id = origInteraction.user.id;
	try {
		const res = await axios.post('http://app:8000/api/mint_htnft', JSON.stringify(payload), {
			headers: {
				Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`
			}
		});
		if (res.data.success) {
			await interaction.update({
				content: `Minted! You can view it at ${process.env.FRONTEND_URL_PREFIX}/messages/${msg.id}`,
				components: []
			});
		} else {
			await interaction.update({content: errorToMessage(res.data), components: []});
		}
	} catch (err) {
		await interaction.update({content: err.message, components: []});
	}
};

const cancelMint = async interaction => {
	await interaction.update({components: []});
};

// one minute
const TIMEOUT = 60000;

const startMint = async interaction => {
	const payload = {
		user_id: interaction.user.id,
		message_id: interaction.targetMessage.id
	};
	let content;
	let components;
	try {
		if (interaction.user.id !== interaction.targetMessage.author.id) {
			content = 'You can\'t mint someone else\'s message!';
		} else {
			const res = await axios.post('http://app:8000/api/mint_check', JSON.stringify(payload), {
				headers: {
					Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`
				}
			});
			const {data} = res;
			if (data.success) {
				content = `Mint the message for **${data.cost} diamonds**? Your current balance is **${data.user_diamonds} diamonds**.`;
				components = [new MessageActionRow().addComponents(
					new MessageButton()
						.setCustomId('complete_mint')
						.setLabel('Mint')
						.setStyle('PRIMARY'),
					new MessageButton()
						.setCustomId('cancel_mint')
						.setLabel('Cancel')
						.setStyle('DANGER'),
				)];
			} else {
				content = errorToMessage(data);
			}
		}
	} catch (err) {
		content = `Error: ${err.message}`;
	}
	await interaction.reply({content, ephemeral: true, components});
	mintInteractions.add(interaction.id, interaction, TIMEOUT);
}

client.on('interactionCreate', async interaction => {
	try {
		if (interaction.commandName === 'Mint HTNFT') {
			await startMint(interaction);
			return;
		}
		if (interaction.type === 'MESSAGE_COMPONENT') {
			switch (interaction.customId) {
				case 'complete_mint': {
					await completeMint(interaction);
					break;
				}
				case 'cancel_mint': {
					await cancelMint(interaction);
					break;
				}
			}
		}
	} catch (err) {
		console.warn('Interaction failed:', err);
	}

});

client.login(process.env.BOT_TOKEN);
