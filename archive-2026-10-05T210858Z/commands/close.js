// commands/close.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { isStaff } = require('../utils/permissions');

const {
  errorEmbed,
  closeRequestEmbed,
} = require('../utils/embeds');

const {
  closeTicket,
  closeRequestActionRow,
} = require('../utils/ticketManager');

const { logTicketClose } = require('../utils/ticketLogger');
const store = require('../utils/dataStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('إدارة وإغلاق التذاكر')

    .addSubcommand((sub) =>
      sub
        .setName('request')
        .setDescription(
          'طلب تأكيد من صاحب التذكرة لإغلاقها'
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName('ticket')
        .setDescription(
          'إغلاق التذكرة الحالية وحذف القناة'
        )
    ),

  async execute(interaction) {
    // =========================
    // التحقق من صلاحيات الإدارة
    // =========================
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            '❌ ليس لديك صلاحية لاستخدام أمر إغلاق التذاكر.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // =========================
    // التأكد أن الأمر داخل تذكرة
    // =========================
    const ticket = store.getTicketByChannel(
      interaction.channel.id
    );

    if (!ticket) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            '❌ لا يمكن استخدام هذا الأمر إلا داخل قناة تذكرة.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // =========================
    // التأكد أن التذكرة مفتوحة
    // =========================
    if (ticket.status !== 'open') {
      return interaction.reply({
        embeds: [
          errorEmbed(
            '🔒 هذه التذكرة مغلقة بالفعل.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    // =========================
    // /close request
    // =========================
    if (sub === 'request') {
      await interaction.reply({
        embeds: [
          closeRequestEmbed(ticket.creatorId),
        ],
        components: [
          closeRequestActionRow(),
        ],
      });

      return;
    }

    // =========================
    // /close ticket
    // =========================
    if (sub === 'ticket') {
      const channel = interaction.channel;

      const result = await closeTicket(
        channel,
        interaction.user
      );

      // في حالة حدوث خطأ أثناء الإغلاق
      if (result.error) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              `❌ تعذر إغلاق التذكرة.\n\n${result.error}`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // =========================
      // تسجيل التذكرة
      // =========================
      try {
        await logTicketClose(
          interaction.guild,
          channel,
          result.ticket
        );
      } catch (error) {
        console.error(
          '[TICKET LOG ERROR]',
          error
        );
      }

      // =========================
      // رسالة الإغلاق
      // =========================
      await interaction.reply({
        content:
          `🔒 **تم إغلاق التذكرة بنجاح.**\n\n` +
          `👤 تم الإغلاق بواسطة <@${interaction.user.id}>.\n` +
          `🗑️ سيتم حذف قناة التذكرة خلال لحظات...`,
      });

      // =========================
      // حذف القناة
      // =========================
      setTimeout(async () => {
        try {
          if (channel && channel.deletable) {
            await channel.delete(
              'Ticket closed'
            );
          }
        } catch (error) {
          console.error(
            '[TICKET DELETE ERROR]',
            error
          );
        }
      }, 1500);

      return;
    }
  },
};