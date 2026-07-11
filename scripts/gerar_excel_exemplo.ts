/**
 * Script auxiliar para gerar uma planilha Excel de exemplo.
 * 
 * COMO USAR:
 *   npx ts-node scripts/gerar_excel_exemplo.ts
 * 
 * Isso vai criar o arquivo: ./imagens_produtos_exemplo.xlsx
 */

import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';

const dados = [
  {
    nome_produto: 'Vestido Longo Floral',
    imagem_principal: '/home/usuario/imagens/vestido-floral-1.jpg',
    imagem_extra_1: '/home/usuario/imagens/vestido-floral-2.jpg',
    imagem_extra_2: '/home/usuario/imagens/vestido-floral-3.jpg',
    imagem_extra_3: '',
    imagem_extra_4: '',
  },
  {
    nome_produto: 'Blazer Alfaiataria Bege',
    imagem_principal: 'https://exemplo.com/fotos/blazer-bege-frente.jpg',
    imagem_extra_1: 'https://exemplo.com/fotos/blazer-bege-costas.jpg',
    imagem_extra_2: '',
    imagem_extra_3: '',
    imagem_extra_4: '',
  },
  {
    nome_produto: 'Calça Wide Leg Preta',
    imagem_principal: './imagens/calca-wide-1.png',
    imagem_extra_1: './imagens/calca-wide-2.png',
    imagem_extra_2: './imagens/calca-wide-3.png',
    imagem_extra_3: './imagens/calca-wide-4.png',
    imagem_extra_4: '',
  },
];

const worksheet = xlsxUtils.json_to_sheet(dados);

// Ajustar largura das colunas
worksheet['!cols'] = [
  { wch: 35 }, // nome_produto
  { wch: 50 }, // imagem_principal
  { wch: 50 }, // imagem_extra_1
  { wch: 50 }, // imagem_extra_2
  { wch: 50 }, // imagem_extra_3
  { wch: 50 }, // imagem_extra_4
];

const workbook = xlsxUtils.book_new();
xlsxUtils.book_append_sheet(workbook, worksheet, 'Produtos');

xlsxWriteFile(workbook, './imagens_produtos_exemplo.xlsx');

console.log('✅ Planilha de exemplo criada: ./imagens_produtos_exemplo.xlsx');
console.log('');
console.log('📝 Edite esse arquivo com seus produtos e imagens, depois rode:');
console.log('   npx ts-node scripts/import_images_from_excel.ts ./imagens_produtos_exemplo.xlsx');
console.log('   (adicione --execute para aplicar de verdade)');
