// Two-tone sky behind the arena: zenith to horizon, flat below it. BattleBridge sets the colours per scene.
Shader "GRRIND/Gradient Sky"
{
    Properties
    {
        _TopColor ("Zenith", Color) = (0.36, 0.56, 0.74, 1)
        _HorizonColor ("Horizon", Color) = (0.78, 0.9, 0.96, 1)
        _Exponent ("Falloff", Range(0.2, 4)) = 0.8
    }
    SubShader
    {
        Tags { "Queue" = "Background" "RenderType" = "Background" "PreviewType" = "Skybox" "RenderPipeline" = "UniversalPipeline" }
        Cull Off ZWrite Off
        Pass
        {
            HLSLPROGRAM
            #pragma vertex Vertex
            #pragma fragment Fragment
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _TopColor;
                half4 _HorizonColor;
                half _Exponent;
            CBUFFER_END

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 direction : TEXCOORD0;
            };

            Varyings Vertex(float4 positionOS : POSITION)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(positionOS.xyz);
                output.direction = positionOS.xyz;
                return output;
            }

            half4 Fragment(Varyings input) : SV_Target
            {
                half height = saturate(normalize(input.direction).y);
                return half4(lerp(_HorizonColor.rgb, _TopColor.rgb, pow(height, _Exponent)), 1);
            }
            ENDHLSL
        }
    }
}
