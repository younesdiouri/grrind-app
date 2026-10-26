// One lighting model for fighters, items, mobs and scenery: the texture carries its painted
// light, the shader adds a stepped ramp from the main light and its shadow, the sky ambient,
// a neutral rim and a MatCap for metal. No PBR, no reflection probe.
Shader "GRRIND/Painted Toon"
{
    Properties
    {
        _BaseMap ("Base", 2D) = "white" {}
        _BaseColor ("Tint", Color) = (1, 1, 1, 1)
        _EyeMode ("Quaternius eye atlas", Float) = 0
        _IrisTint ("Iris tint", Color) = (1, 1, 1, 1)
        _EyeSkinTint ("Eyelid tint", Color) = (1, 1, 1, 1)
        _Ambient ("Ambient strength", Range(0, 3)) = 1.3
        _RampCenter ("Ramp centre", Range(-1, 1)) = 0
        _RampSteps ("Ramp steps (0 = smooth)", Range(0, 4)) = 2
        _RimColor ("Rim", Color) = (0.8, 0.9, 1, 1)
        _RimPower ("Rim power", Range(0.5, 8)) = 3.5
        _RimStrength ("Rim strength", Range(0, 1)) = 0.3
        _MatCap ("Metal MatCap", 2D) = "gray" {}
        _MetalMask ("Metal mask", 2D) = "white" {}
        _Metal ("Metal", Range(0, 1)) = 0
        _Cull ("Cull", Float) = 2
        _HitFlash ("Hit flash", Range(0, 1)) = 0
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

        CBUFFER_START(UnityPerMaterial)
            float4 _BaseMap_ST;
            half4 _BaseColor;
            half4 _IrisTint;
            half4 _EyeSkinTint;
            half _EyeMode;
            half _Ambient;
            half _RampCenter;
            half _RampSteps;
            half4 _RimColor;
            half _RimPower;
            half _RimStrength;
            half _Metal;
            half _Cull;
            half _HitFlash;
        CBUFFER_END

        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);
        TEXTURE2D(_MatCap);
        SAMPLER(sampler_MatCap);
        TEXTURE2D(_MetalMask);

        struct Attributes
        {
            float4 positionOS : POSITION;
            float3 normalOS : NORMAL;
            float2 uv : TEXCOORD0;
        };
        ENDHLSL

        Pass
        {
            Name "Forward"
            Tags { "LightMode" = "UniversalForward" }
            Cull [_Cull]

            HLSLPROGRAM
            #pragma vertex Vertex
            #pragma fragment Fragment
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_fog

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float3 positionWS : TEXCOORD2;
                half fog : TEXCOORD3;
            };

            Varyings Vertex(Attributes input)
            {
                Varyings output;
                VertexPositionInputs position = GetVertexPositionInputs(input.positionOS.xyz);
                output.positionCS = position.positionCS;
                output.positionWS = position.positionWS;
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                output.fog = ComputeFogFactor(position.positionCS.z);
                return output;
            }

            half4 Fragment(Varyings input, half facing : VFACE) : SV_Target
            {
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv) * _BaseColor;
                if (_EyeMode > .5)
                {
                    // The source atlas has a central iris and painted skin around the sclera.
                    half iris = 1 - smoothstep(.098, .112, distance(input.uv, float2(.5, .5)));
                    half value = max(albedo.r, max(albedo.g, albedo.b));
                    half pigment = smoothstep(.012, .035, value) * (1 - smoothstep(.55, .8, value));
                    half eyelid = (1 - iris) * smoothstep(.08, .16, albedo.r - albedo.g);
                    albedo.rgb *= lerp(half3(1,1,1), _IrisTint.rgb, iris * pigment);
                    albedo.rgb *= lerp(half3(1,1,1), _EyeSkinTint.rgb, eyelid);
                }
                // Double-sided cloth shows its back face inside sleeves: light it from that side.
                float3 normal = normalize(input.normalWS) * (facing > 0 ? 1 : -1);
                Light light = GetMainLight(TransformWorldToShadowCoord(input.positionWS));
                half lambert = saturate((dot(normal, light.direction) - _RampCenter) * .5 + .5);
                // Flat bands read as facets without touching the meshes; fwidth keeps their edge one pixel wide.
                half bands = lambert * max(_RampSteps, 1);
                half edge = fwidth(bands) * .75 + 1e-3;
                half stepped = (floor(bands) + smoothstep(.5 - edge, .5 + edge, frac(bands))) / max(_RampSteps, 1);
                half ramp = (_RampSteps > .5 ? stepped : smoothstep(.3, .7, lambert)) * light.shadowAttenuation;
                half3 colour = albedo.rgb * lerp(SampleSH(normal) * _Ambient, light.color, ramp);
                // MatCap metal: the hue comes from the MatCap, the texture keeps its detail as value.
                half metal = _Metal * SAMPLE_TEXTURE2D(_MetalMask, sampler_BaseMap, input.uv).r;
                float2 matcapUV = mul((float3x3)UNITY_MATRIX_V, normal).xy * .49 + .5;
                half value = saturate(dot(albedo.rgb, half3(.3, .59, .11)) * 1.8);
                half3 shine = SAMPLE_TEXTURE2D(_MatCap, sampler_MatCap, matcapUV).rgb * value * lerp(.65, 1, ramp);
                colour = lerp(colour, shine, metal);
                float3 view = GetWorldSpaceNormalizeViewDir(input.positionWS);
                half rim = pow(1 - saturate(dot(normal, view)), _RimPower) * _RimStrength;
                // ImpactFx whitens the struck fighter on the contact frame.
                colour = lerp(colour + _RimColor.rgb * rim, half3(1, .97, .92), _HitFlash * .5);
                return half4(MixFog(colour, input.fog), 1);
            }
            ENDHLSL
        }

        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }
            ZWrite On
            ColorMask 0
            Cull [_Cull]

            HLSLPROGRAM
            #pragma vertex Vertex
            #pragma fragment Fragment

            float3 _LightDirection;

            float4 Vertex(Attributes input) : SV_POSITION
            {
                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                float4 positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, _LightDirection));
                #if UNITY_REVERSED_Z
                positionCS.z = min(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #else
                positionCS.z = max(positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                return positionCS;
            }

            half Fragment() : SV_Target
            {
                return 0;
            }
            ENDHLSL
        }

        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode" = "DepthOnly" }
            ZWrite On
            ColorMask R
            Cull [_Cull]

            HLSLPROGRAM
            #pragma vertex Vertex
            #pragma fragment Fragment

            float4 Vertex(Attributes input) : SV_POSITION
            {
                return TransformObjectToHClip(input.positionOS.xyz);
            }

            half Fragment() : SV_Target
            {
                return 0;
            }
            ENDHLSL
        }
    }
}
