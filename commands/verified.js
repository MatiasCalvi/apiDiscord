const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verified")
    .setDescription("Check if your user tag is valid"),
  async execute(interaction) {
    if (
      !interaction.member.roles.cache.some(
        (role) => role.name === "no-verificado"
      )
    ) {
      interaction.reply(
        "Lo siento, este comando no puede ser utilizado."
      );
    } else {
      let tag = interaction.user.tag;
      const [username, discriminator] = tag.split("#");
      axios
        .get(`http://localhost:8000/api/user/${username}%23${discriminator}`)
        .then((response) => {
          if (response.data.success) {
            let nickName = `${response.data.data.lastName}${" "}${
              response.data.data.name
            }`;
            if (response.data.data.role === "alumno") {
              let role = interaction.guild.roles.cache.find(
                (r) => r.name === "alumno"
              );
              interaction.member.roles.add(role);
              interaction.reply(
                `Has podido ser verificado por lo que ahora tu rol es de "alumno"`
              );
            }
            if (response.data.data.role === "mentor") {
              let role = interaction.guild.roles.cache.find(
                (r) => r.name === "mentor"
              );
              interaction.member.roles.add(role);
              interaction.reply(
                `Has podido ser verificado por lo que ahora tu rol es de "mentor"`
              );
            }
            interaction.member.setNickname(nickName);
            let noVerifiedRole = interaction.guild.roles.cache.find((r) => r.name === "no-verificado");
            interaction.member.roles.remove(noVerifiedRole);
          }
        })
        .catch((e) => {
          if (!e.response.data.success) {
            let channel = interaction.guild.channels.cache.find(
              (channel) => channel.name === "no-verificados"
            );
            if (channel) {
              channel.send(
                `El usuario ${interaction.user.username} con el tag ${interaction.user.tag} no existe en la base de datos por lo que no ha sido verificado`
              );
              interaction.reply("No estas verificado");
            }
          }
          console.log(e);
        });
    }
  },
};
