import { EffectComposer, Bloom, SMAA, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
// Bloom on lights/star/windows, ACES tone mapping, SMAA edge smoothing, soft vignette.
// SMAA runs on every tier: without it branch edges and roof lines crawl, which reads as "pixelated" even at full sharpness.
export default function Effects({ tier }) {
  const fx = [
    <Bloom key="b" mipmapBlur luminanceThreshold={.82} luminanceSmoothing={.2} intensity={tier === 'low' ? .6 : .8} resolutionScale={tier === 'low' ? .5 : 1} />,
    <ToneMapping key="t" mode={ToneMappingMode.ACES_FILMIC} />,
    <SMAA key="s" />,
    <Vignette key="v" offset={.3} darkness={.55} />,
  ].filter(Boolean)
  return <EffectComposer multisampling={0} disableNormalPass>{fx}</EffectComposer>
}
