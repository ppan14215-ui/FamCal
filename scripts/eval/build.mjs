/**
 * Bundles scripts/eval/run.ts with the app's own code (assistent.ts, the store,
 * the executor) for plain Node. Native modules become empty stubs; the test
 * only needs the logic that turns Claude's answer into calendar changes.
 * esbuild comes from the npx cache, so package.json stays as it is.
 */
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mods = execSync("npm exec --yes --package=esbuild@0.28.2 -- sh -c 'dirname $(dirname $(command -v esbuild))'", { encoding: 'utf8' }).trim();
const { build } = await import(pathToFileURL(path.join(mods, 'esbuild/lib/main.js')).href);

const STUB = /(^|\/)(auth|cloud)$|^expo\/fetch$|^@react-native-async-storage\/|^react-native-reanimated|^react-native-worklets|^expo-(haptics|notifications|calendar|apple-authentication|web-browser|auth-session|router|image|file-system|sharing|speech|av|linking|constants|device|crypto)|^@react-native-google-signin/;
const proxy = "const mk=()=>{const f=function(){return p};const p=new Proxy(f,{get:(t,k)=>k===Symbol.toPrimitive?(()=>''):k==='then'?undefined:k==='supabase'?null:k==='getItem'?(async()=>null):k==='setItem'?(async()=>{}):k==='getAuth'?(()=>({session:null})):p,apply:()=>p,construct:()=>p});return p}; const P=mk(); export const Easing=P; export const FadeIn=P; export const FadeInDown=P; export const FadeOut=P; export const Keyframe=P; export const makeMutable=P; export const LinearTransition=P; export const Redirect=P; export const SplashScreen=P; export const Stack=P; export const StatusBar=P; export const Tabs=P; export const fetch=P; export const getLocales=P; export const requireOptionalNativeModule=P; export const router=P; export const scheduleOnRN=P; export const useFocusEffect=P; export const useFonts=P; export const useLocalSearchParams=P; export const usePathname=P; export const useSharedValue=P; export const withTiming=P; export const supabase=null; export const getAuth=()=>({session:null}); export const onAuth=()=>()=>{}; export default {getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}};";
const FIXED = {
  'react-native': "module.exports={Platform:{OS:'web'},NativeModules:{},I18nManager:{}};",
  // Wie Julians Handy: Oberfläche englisch, er spricht deutsch (31.10.: die Antwort sprang ins Englische).
  'expo-localization': "module.exports={getLocales:()=>[{languageCode:'en'}]};",
};

await build({
  entryPoints: [path.join(here, 'run.ts')], bundle: true, platform: 'node', outfile: process.argv[2] ?? path.join(here, '.run.cjs'),
  loader: { '.webp': 'empty', '.png': 'empty', '.js': 'jsx' }, logLevel: 'error',
  // The app runs on its fixed test day (Do 29.10.2026, 08:50), whatever .env says, so "morgen" always means the same day.
  define: { 'process.env.EXPO_PUBLIC_DEMO': '"1"' },
  plugins: [{ name: 'stub', setup(b) {
    b.onResolve({ filter: /^(react-native|expo-localization)$/ }, (a) => ({ path: a.path, namespace: 'fixed' }));
    b.onLoad({ filter: /.*/, namespace: 'fixed' }, (a) => ({ contents: FIXED[a.path], loader: 'js' }));
    b.onResolve({ filter: STUB }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: proxy, loader: 'js' }));
  } }],
});
