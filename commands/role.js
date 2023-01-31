const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Asigna un rol a un miembro de un servidor")
    .addStringOption((option) =>
      option
        .setName("input1")
        .setDescription("Nombre del rol a asignar")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("input2")
        .setDescription("DiscordTag del miembro a asignar")
        .setRequired(true)
    ),
  async execute(interaction) {

    const input1 = interaction.options._hoistedOptions[0]?.value;
    let input2 = interaction.options._hoistedOptions[1]?.value;
    input2=input2.replace("<@", "").replace(">", "");

    const member = interaction.member.guild.members.cache.find(
      (member) => member.user.id === input2
    );
      
    if (member===undefined) {
      await interaction.reply("No se ha encontrado al miembro.");
      return;
    }

     const role = interaction.member.guild.roles.cache.find(
      (role) => role.name === input1
    ); 

  

    if (role===undefined) {
      await interaction.reply("No se ha encontrado el rol especificado.");
      return;
    }
 
    try {
      await member.roles.remove(member.roles.cache.map((role) => role.id));
      await member.roles.add(role);
      await interaction.reply(
        `Se ha asignado el rol "${input1}" al usuario "${input2}".`
      );
    } catch (error) {
      await interaction.reply("Ha ocurrido un error al asignar el rol.");
      console.error(error);
    } 
  },
};
