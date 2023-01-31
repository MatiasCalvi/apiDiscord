const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Test Arguments")
    .addStringOption((option) =>
      option.setName("input1").setDescription("The first input to echo back")
      .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("input2").setDescription("The second input to echo back")
      .setRequired(true)
    ),
  async execute(interaction) {
    const input1 = interaction.options._hoistedOptions[0]?.value;
    const input2 = interaction.options._hoistedOptions[1]?.value;

    await interaction.reply(`input1: ${input1}, input2: ${input2}`);
  },
};
