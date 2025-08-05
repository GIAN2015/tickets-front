import emailjs from '@emailjs/browser';

export const enviarCorreo = async ({
  toEmail,
  subject,
  message,
}: {
  toEmail: string;
  subject: string;
  message: string;
}) => {
  try {
    const templateParams = {
      to_email: toEmail,
      subject,
      message,
    };

    const result = await emailjs.send(
      'service_abc123',         // 🔁 Reemplaza por tu Service ID
      'template_j8exnay',        // 🔁 Reemplaza por tu Template ID
      templateParams,
      'FBQ9PmnOeJKELISx3'         // 🔁 Reemplaza por tu Public Key
    );

    return result;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw error;
  }
};
