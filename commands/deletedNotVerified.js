const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deleted_not_verified")
    .setDescription("Provides information about the user."),
  async execute(interaction) {
    if (
      interaction.member.roles.cache.some((role) => role.name === "mentor") ||
      interaction.member.roles.cache.some((role) => role.name === "admin")
    ) {
      const guild = interaction.guild;
      const role = guild.roles.cache.find(
        (role) => role.name === "no-verificado"
      );
      const membersWithRole = guild.members.cache.filter((member) =>
        member.roles.cache.has(role.id)
      );

      membersWithRole.forEach(async (member) => {
        await member.kick("Expulsado por no tener verificación");
      });

      interaction.reply(
        "Se han expulsado a todos los usuarios con el rol 'no-verificado'"
      );
    } else {
      interaction.reply("No tienes permiso para usar este comando");
    }
  },
};
