import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import requestPasswordResetEmail from '@/api/auth/requestPasswordResetEmail';
import { httpErrorToHuman } from '@/api/http';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import { useStoreState } from 'easy-peasy';
import Field from '@/components/elements/Field';
import { Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import Reaptcha from 'reaptcha';
import useFlash from '@/plugins/useFlash';

interface Values {
    email: string;
}

export default () => {
    const ref = useRef<Reaptcha>(null);
    const [ token, setToken ] = useState('');

    const { clearFlashes, addFlash } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState(state => state.settings.data!.recaptcha);

    useEffect(() => {
        clearFlashes();
    }, []);

    const handleSubmission = ({ email }: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearFlashes();

        // If there is no token in the state yet, request the token and then abort this submit request
        // since it will be re-submitted when the recaptcha data is returned by the component.
        if (recaptchaEnabled && !token) {
            ref.current!.execute().catch(error => {
                console.error(error);

                setSubmitting(false);
                addFlash({ type: 'error', title: '错误', message: httpErrorToHuman(error) });
            });

            return;
        }

        requestPasswordResetEmail(email, token)
            .then(response => {
                resetForm();
                addFlash({ type: 'success', title: '成功', message: response });
            })
            .catch(error => {
                console.error(error);
                addFlash({ type: 'error', title: '错误', message: httpErrorToHuman(error) });
            })
            .then(() => {
                setToken('');
                if (ref.current) ref.current.reset();

                setSubmitting(false);
            });
    };

    return (
        <Formik
            onSubmit={handleSubmission}
            initialValues={{ email: '' }}
            validationSchema={object().shape({
                email: string().email('必须提供有效的电子邮件地址才能继续。')
                    .required('必须提供有效的电子邮件地址才能继续。'),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <LoginFormContainer
                    title={'请求重置密码'}
                    css={tw`w-full flex`}
                >
                    <Field
                        light
                        label={'邮箱地址'}
                        description={'输入您的帐户电子邮件地址以接收有关重置密码的说明。'}
                        name={'email'}
                        type={'email'}
                    />
                    <div css={tw`mt-6`}>
                        <Button
                            type={'submit'}
                            size={'xlarge'}
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                        >
                            发送邮件
                        </Button>
                    </div>
                    {recaptchaEnabled &&
                    <Reaptcha
                        ref={ref}
                        size={'invisible'}
                        sitekey={siteKey || '_invalid_key'}
                        onVerify={response => {
                            setToken(response);
                            submitForm();
                        }}
                        onExpire={() => {
                            setSubmitting(false);
                            setToken('');
                        }}
                    />
                    }
                    <div css={tw`mt-6 text-center`}>
                        <Link
                            to={'/auth/login'}
                            css={tw`text-xs text-neutral-500 tracking-wide uppercase no-underline hover:text-neutral-700`}
                        >
                            返回登录
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
};