const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("promove")
    .setDescription('Cambia el rol de "alumno" a "egresado"'),
  async execute(interaction) {
    if (interaction.member.roles.cache.some((role) => role.name === "admin")) {
      const guild = interaction.member.guild;
      const studentRole = guild.roles.cache.find(
        (role) => role.name === "alumno"
      );
      const graduateRole = guild.roles.cache.find(
        (role) => role.name === "egresado"
      );

      const students = guild.members.cache.filter((member) =>
        member.roles.cache.has(studentRole.id)
      );
      for (const student of students.values()) {
        await student.roles.remove(studentRole);
        await student.roles.add(graduateRole);

        try {
          const encodedDiscordTag = encodeURIComponent(student.user.tag);
          await axios.patch(
            `http://localhost:8000/api/user/${encodedDiscordTag}`,
            {
              role: "egresado",
            }
          );
        } catch (error) {
          console.error(error);
        }
      }

      interaction.reply(
        `Se han cambiado ${students.size} usuarios de rol "alumno" a "egresado".`
      );
    }
    else{
      interaction.reply("No tienes permiso para usar este comando");
    }
  },
};
