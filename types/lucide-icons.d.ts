// Per-icon imports keep the bundle from pulling all ~1,600 lucide icons (Metro has no tree shaking)
declare module 'lucide-react-native/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react-native';
  const Icon: LucideIcon;
  export default Icon;
}
