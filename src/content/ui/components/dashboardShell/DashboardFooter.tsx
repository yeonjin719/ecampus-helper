import { DASHBOARD_SHELL_STYLES as styles } from './styles';

interface DashboardFooterProps {
    contactLink: string;
}

export function DashboardFooter({ contactLink }: DashboardFooterProps) {
    const currentYear = new Date().getFullYear();

    return (
        <footer id="ecdash-footer" className={styles.footer}>
            <span className={styles.copyright}>
                © {currentYear} Cotton. All rights reserved.
            </span>
            <a
                id="ecdash-contact-link"
                href={contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactLink}
            >
                문의
            </a>
        </footer>
    );
}
