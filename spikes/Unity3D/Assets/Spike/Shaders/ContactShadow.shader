// Soft blob under a fighter: grounds the character without real-time shadow maps.
Shader "GRRIND/Contact Shadow"
{
    Properties
    {
        _Color ("Colour", Color) = (0, 0, 0.02, 0.55)
    }
    SubShader
    {
        Tags { "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "Queue" = "Transparent-10" }
        Pass
        {
            Tags { "LightMode" = "SRPDefaultUnlit" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off

            HLSLPROGRAM
            #pragma vertex Vertex
            #pragma fragment Fragment
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
                half4 _Color;
            CBUFFER_END

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            Varyings Vertex(float4 positionOS : POSITION, float2 uv : TEXCOORD0)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(positionOS.xyz);
                output.uv = uv;
                return output;
            }

            half4 Fragment(Varyings input) : SV_Target
            {
                half fade = 1 - smoothstep(0.15, 0.5, length(input.uv - 0.5));
                return half4(_Color.rgb, _Color.a * fade);
            }
            ENDHLSL
        }
    }
}
