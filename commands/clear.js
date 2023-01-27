const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Provides information about the user."),
  async execute(interaction) {
    if(interaction.member.roles.cache.some(role => role.name === 'mentor') || interaction.member.roles.cache.some(role => role.name === 'admin')) {
      interaction.channel
        .bulkDelete(100)
        .then((messages) => {
          interaction.reply(
            `Fueron eliminados ${messages.size} mensajes`
          );
        })
        .catch(console.error);
    } else {
        interaction.reply("No tienes permiso para usar este comando");
    }
  },
};
