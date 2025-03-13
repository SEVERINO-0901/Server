const sdk = require('node-appwrite');
const ftp = require('basic-ftp');
const axios = require('axios');

module.exports = async function ({ req, res }) {
  // Configura o Appwrite SDK
  const client = new sdk.Client()
      .setEndpoint("https://cloud.appwrite.io/v1") // Substitua pelo seu endpoint Appwrite
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

  const storage = new sdk.Storage(client);

  try {
      // O Appwrite Webhook envia os dados no req.payload
      const fileId = req.payload.$id; // ID do arquivo enviado
      const fileName = req.payload.name;

      console.log(`Recebido arquivo ${fileName} (ID: ${fileId})`);

      // Baixar o arquivo do Appwrite Storage
      const response = await axios.get(`https://cloud.appwrite.io/v1/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`, {
          headers: { "X-Appwrite-Key": process.env.APPWRITE_API_KEY },
          responseType: "arraybuffer",
      });

      // Conectar ao servidor FTP
      const clientFTP = new ftp.Client();
      clientFTP.ftp.verbose = true;

      await clientFTP.access({
          host: process.env.FTP_HOST,
          user: process.env.FTP_USER,
          password: process.env.FTP_PASSWORD,
          secure: false, // Defina como true se o servidor exigir SSL/TLS
      });

      // Enviar arquivo para o FTP
      await clientFTP.uploadFrom(Buffer.from(response.data), `${process.env.FTP_TARGET_FOLDER}/${fileName}`);
      clientFTP.close();

      console.log(`Arquivo ${fileName} enviado para FTP com sucesso!`);

      return res.json({ success: true, message: `Arquivo ${fileName} enviado para FTP com sucesso!` });

  } catch (error) {
      console.error("Erro ao transferir arquivo:", error);
      return res.json({ success: false, error: error.message });
  }
};


