const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verified")
    .setDescription("Check if your user tag is valid"),
  async execute(interaction) {
    if (interaction.member.roles.cache.some((role) => role.name === "alumno")) {
        interaction.channel.send("Lo siento, este comando ya se ha utilizado.");
    } else {
      let tag = interaction.user.tag;
      const [username, discriminator] = tag.split("#");
      axios
        .get(`http://localhost:8080/api/user/${username}%23${discriminator}`)
        .then((response) => {
            if (response.data.success) {
            let nickName=`${response.data.data.lastName}${' '}${response.data.data.name}`
            let role = interaction.guild.roles.cache.find(
              (r) => r.name === "alumno"
            );
             interaction.member.roles.add(role);
             interaction.member.setNickname(nickName);  
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
            }
          }  
          console.log(e)
        });
    }
  },
};
