import { EffectComposer, Bloom, SMAA, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
// Bloom on lights/star/windows, ACES tone mapping, SMAA (not on low), soft vignette.
export default function Effects({ tier }) {
  const fx = [
    <Bloom key="b" mipmapBlur luminanceThreshold={.82} luminanceSmoothing={.2} intensity={tier === 'low' ? .6 : .8} resolutionScale={tier === 'low' ? .5 : 1} />,
    <ToneMapping key="t" mode={ToneMappingMode.ACES_FILMIC} />,
    tier !== 'low' ? <SMAA key="s" /> : null,
    <Vignette key="v" offset={.3} darkness={.55} />,
  ].filter(Boolean)
  return <EffectComposer multisampling={0} disableNormalPass>{fx}</EffectComposer>
}
