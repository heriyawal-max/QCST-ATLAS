import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Admin Mode)
// process.env.SUPABASE_URL and process.env.SUPABASE_SERVICE_ROLE_KEY must be set in Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL; // Fallback
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
    // 1. Validasi Method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const update = req.body;

        // 2. Handle Callback Query (Tombol Approve/Reject diklik)
        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const data = callbackQuery.data; // ex: "approve:ATL-123"
            const chatId = callbackQuery.message.chat.id;
            const messageId = callbackQuery.message.message_id;

            // Parse Data
            const [action, ticketNumber] = data.split(':'); // ["approve", "ATL-123"]

            console.log(`Processing ${action} for ${ticketNumber}`);

            // Init Supabase
            if (!supabaseServiceKey) {
                throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
            }
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            // Cari Ticket ID
            const { data: requestData, error: findError } = await supabase
                .from('requests')
                .select('id, created_by_id')
                .eq('ticket_number', ticketNumber)
                .single();

            if (findError || !requestData) {
                await answerCallback(callbackQuery.id, "❌ Tiket tidak ditemukan!");
                return res.status(200).json({ ok: true });
            }

            let responseText = "";

            // Eksekusi Action
            if (action === 'approve') {
                // Update Status ke Selesai & Validated
                // Cari ID Manager untuk field validated_by
                // Kita ambil Manager pertama yang ditemukan sebagai aktor validasi
                const { data: managerData } = await supabase
                    .from('app_users')
                    .select('id')
                    .eq('role', 'manager')
                    .limit(1)
                    .single();

                const validatorId = managerData?.id || null;

                await supabase.from('requests').update({
                    status: 'Selesai',
                    validated_at: new Date().toISOString(),
                    validated_by: validatorId // PENTING: Agar status di sisi User berubah jadi "Selesai"
                }).eq('id', requestData.id);

                responseText = `✅ Tiket ${ticketNumber} BERHASIL DI-APPROVE!`;

                // Kirim Notif ke User Pemilik Tiket
                if (requestData.created_by_id) {
                    await supabase.from('app_notifications').insert([{
                        user_id: requestData.created_by_id,
                        title: 'Tiket Disetujui (via Telegram)',
                        message: `Tiket ${ticketNumber} telah divalidasi oleh Manager via Telegram.`,
                        is_read: false
                    }]);
                }

            } else if (action === 'reject') {
                await supabase.from('requests').update({
                    status: 'Dibatalkan'
                }).eq('id', requestData.id);

                responseText = `🚫 Tiket ${ticketNumber} TELAH DITOLAK.`;

                if (requestData.created_by_id) {
                    await supabase.from('app_notifications').insert([{
                        user_id: requestData.created_by_id,
                        title: 'Tiket Ditolak (via Telegram)',
                        message: `Tiket ${ticketNumber} ditolak oleh Manager.`,
                        is_read: false
                    }]);
                }
            }

            // 3. Jawab Telegram (Hilangkan Loading di tombol)
            await answerCallback(callbackQuery.id, "✅ Permintaan diproses!");

            // 4. Edit Pesan Asli (Hilangkan Tombol Approve/Reject biar ga diklik 2x)
            // Kita sisakan tombol Link PDF
            const pdfButton = callbackQuery.message.reply_markup.inline_keyboard[1] || []; // Baris kedua biasanya PDF

            await editMessage(chatId, messageId,
                `${callbackQuery.message.text}\n\n==============\n**STATUS: ${action === 'approve' ? '✅ APPROVED' : '🚫 REJECTED'}**`,
                { inline_keyboard: [pdfButton] } // Sisakan tombol PDF
            );

            return res.status(200).json({ success: true });
        }

        // Default 200 OK
        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('Telegram Webhook Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Helper: Answer Callback Query
async function answerCallback(callbackQueryId, text) {
    const token = "8448554983:AAFnhz2Yi2ZcBgplrJCorx107cPO83eM5OM";
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
    });
}

// Helper: Edit Message Text
async function editMessage(chatId, messageId, text, replyMarkup) {
    const token = "8448554983:AAFnhz2Yi2ZcBgplrJCorx107cPO83eM5OM";
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: replyMarkup
        })
    });
}
