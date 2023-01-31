const { SlashCommandBuilder,EmbedBuilder } = require('discord.js');

const exampleEmbed = new EmbedBuilder()
.setColor('Greyple')
.setTitle('Pong!')
.setDescription('Contesta con Pong!')
.setFooter({ text: 'Forge The Code System', iconURL: 'https://cdn.discordapp.com/attachments/1064732482454421615/1066220082675589191/reallogo.png' });

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Contesta con Pong!'),
	async execute(interaction) {
		await interaction.reply({ embeds: [exampleEmbed] });
	},
};