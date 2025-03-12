const ftp = require('basic-ftp'); // Biblioteca para FTP
const sdk = require('node-appwrite'); // SDK do Appwrite

// Configuração do Appwrite
const client = new sdk.Client();
const storage = new sdk.Storage(client);

client
  .setEndpoint('https://cloud.appwrite.io/v1') // Substitua pelo seu endpoint do Appwrite
  .setProject('67d17871002661a1db89'); // Substitua pelo seu ID de projeto Appwrite

module.exports = async (req, res) => {
  try {
    const bucketId = '67d17b190014e53852e2'; // Substitua pelo ID do seu bucket
    const ftpConfig = {
      host: 'www.palmasistemas.com.br',
      user: 'palmasistemas',
      password: 'gremio1983',
      secure: false // Defina como true se for FTPS
    };

    // 1. Listar todos os arquivos do bucket
    const files = await storage.listFiles(bucketId); // Lista todos os arquivos do bucket

    // 2. Conectar ao servidor FTP
    const ftpClient = new ftp.Client();
    await ftpClient.access(ftpConfig); // Conecta ao servidor FTP

    // 3. Enviar todos os arquivos para o FTP
    for (const file of files.files) {
      const fileData = await storage.getFileView(bucketId, file.$id); // Obtém os dados do arquivo

      // Enviar o arquivo para o FTP
      await ftpClient.uploadFrom(fileData, 'www/Palma/' + file.name); // Substitua pelo caminho desejado
      console.log(`Arquivo ${file.name} enviado para o FTP!`);
    }

    // 4. Deletar todos os arquivos do bucket após a transferência
    for (const file of files.files) {
      await storage.deleteFile(bucketId, file.$id); // Deleta o arquivo do bucket
      console.log(`Arquivo ${file.name} deletado do Appwrite!`);
    }

    // Fechar a conexão FTP
    ftpClient.close();

    // Resposta de sucesso - Retorne a resposta diretamente no formato JSON
    return res.json({ success: true, message: 'Todos os arquivos enviados para o FTP e deletados do Appwrite.' });
  } catch (error) {
    console.error('Erro ao processar os arquivos:', error);

    // Resposta de erro - Retorne a resposta de erro diretamente no formato JSON
    return res.json({ success: false, message: 'Erro ao processar os arquivos', error: error.message });
  }
};


