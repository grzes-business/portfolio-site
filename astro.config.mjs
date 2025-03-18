import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon'; // Import the icon integration

export default defineConfig({
  integrations: [
    tailwind(), 
    icon({
      // This ensures Simple Icons are included
      iconify: {
        // Include the collections you want to use
        collections: {
          'simple-icons': '@iconify-json/simple-icons',
        },
      },
    })
  ],
});