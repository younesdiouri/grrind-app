// Painted MMO look: the texture already carries its painted light, so the shader only adds
// a soft two-tone ramp from the main light, a rim and an inverted-hull outline. No PBR.
Shader "GRRIND/Painted Toon"
{
    Properties
    {
        _BaseMap ("Base", 2D) = "white" {}
        _BaseColor ("Tint", Color) = (1, 1, 1, 1)
        _EyeMode ("Quaternius eye atlas", Float) = 0
        _IrisTint ("Iris tint", Color) = (1, 1, 1, 1)
        _EyeSkinTint ("Eyelid tint", Color) = (1, 1, 1, 1)
        _ShadowTint ("Shadow tint", Color) = (0.66, 0.6, 0.76, 1)
        _RampCenter ("Ramp centre", Range(-1, 1)) = 0
        _RampSoftness ("Ramp softness", Range(0.01, 1)) = 0.22
        _RimColor ("Rim", Color) = (0.55, 0.88, 1, 1)
        _RimPower ("Rim power", Range(0.5, 8)) = 3.5
        _RimStrength ("Rim strength", Range(0, 1)) = 0.35
        _OutlineColor ("Outline", Color) = (0.07, 0.06, 0.1, 1)
        _OutlineWidth ("Outline width", Range(0, 0.01)) = 0.0018
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
            half4 _ShadowTint;
            half4 _RimColor;
            half4 _OutlineColor;
            half _RampCenter;
            half _RampSoftness;
            half _RimPower;
            half _RimStrength;
            float _OutlineWidth;
            half _HitFlash;
        CBUFFER_END

        TEXTURE2D(_BaseMap);
        SAMPLER(sampler_BaseMap);

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
            Cull Back

            HLSLPROGRAM
            #pragma vertex Vertex
            #pragma fragment Fragment

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float3 positionWS : TEXCOORD2;
            };

            Varyings Vertex(Attributes input)
            {
                Varyings output;
                VertexPositionInputs position = GetVertexPositionInputs(input.positionOS.xyz);
                output.positionCS = position.positionCS;
                output.positionWS = position.positionWS;
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                return output;
            }

            half4 Fragment(Varyings input) : SV_Target
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
                float3 normal = normalize(input.normalWS);
                Light light = GetMainLight();
                half lambert = dot(normal, light.direction);
                half ramp = smoothstep(_RampCenter - _RampSoftness, _RampCenter + _RampSoftness, lambert);
                half3 colour = albedo.rgb * lerp(_ShadowTint.rgb, light.color, ramp);
                float3 view = GetWorldSpaceNormalizeViewDir(input.positionWS);
                half rim = pow(1 - saturate(dot(normal, view)), _RimPower) * _RimStrength;
                // ImpactFx whitens the struck fighter on the contact frame.
                return half4(lerp(colour + _RimColor.rgb * rim, half3(1, .97, .92), _HitFlash * .5), 1);
            }
            ENDHLSL
        }

        Pass
        {
            Name "Outline"
            Tags { "LightMode" = "SRPDefaultUnlit" }
            Cull Front

            HLSLPROGRAM
            #pragma vertex Vertex
            #pragma fragment Fragment

            float4 Vertex(Attributes input) : SV_POSITION
            {
                // Extrude in clip space so the line keeps the same width at any distance.
                float4 positionCS = TransformObjectToHClip(input.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                float2 normalCS = mul((float3x3)UNITY_MATRIX_VP, normalWS).xy;
                float2 offset = normalize(normalCS + 1e-5) * _OutlineWidth * positionCS.w * 2;
                offset.x *= _ScreenParams.y / _ScreenParams.x;
                positionCS.xy += offset;
                return positionCS;
            }

            half4 Fragment() : SV_Target
            {
                return _OutlineColor;
            }
            ENDHLSL
        }

        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode" = "DepthOnly" }
            ZWrite On
            ColorMask R

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
