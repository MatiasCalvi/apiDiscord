const dotenv = require('dotenv');
dotenv.config();
const fs = require('node:fs');
const path = require('node:path');
const{TOKEN}=process.env

const { Client, Collection, Events, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});


client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`); 
});

client.login(TOKEN);

client.on(Events.GuildMemberAdd, (member) => {
    // Obtener el rol "alumno"
    let role = member.guild.roles.cache.find(r => r.name === "alumno");
    // Asignar el rol al miembro
    member.roles.add(role);
	console.log(member.guild.roles.cache)
});
client.commands = new Collection();


const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on(Events.InteractionCreate, async interaction => {
	
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});



