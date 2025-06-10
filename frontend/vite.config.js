import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
        tailwindcss(),
  ], theme: {
    extend: {
      fontFamily:{
        aqem: ['aqem'],
        flore: ['flore'],
        monogram: ['monogram'],
        darling:['darling'],
        pixel: ['Pixel'],
        wild:['Wildly'],
        coffee:['coffee'],
        cool:['cool'],
        lostar:['Lostar'],
        mine:['mine'],
      },
      fontSize:{
        header:'10em'
      }
    },
  },
})
